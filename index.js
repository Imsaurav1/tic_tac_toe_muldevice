const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

let waitingPlayers = [];
let games = {};

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("find", (e) => {
        if (!e.name) return;

        socket.playerName = e.name;
        waitingPlayers.push({ id: socket.id, name: e.name });

        if (waitingPlayers.length >= 2) {
            const p1 = waitingPlayers.shift();
            const p2 = waitingPlayers.shift();
            const roomId = uuidv4();

            const game = {
                roomId,
                players: {
                    X: { id: p1.id, name: p1.name },
                    O: { id: p2.id, name: p2.name },
                },
                board: Array(9).fill(null),
                currentTurn: "X",
                moves: 0
            };

            games[roomId] = game;

            io.sockets.sockets.get(p1.id)?.join(roomId);
            io.sockets.sockets.get(p2.id)?.join(roomId);

            io.to(roomId).emit("find", {
                roomId,
                players: game.players,
                currentTurn: game.currentTurn
            });
        }
    });

    socket.on("playing", ({ roomId, index, value, name }) => {
        const game = games[roomId];
        if (!game || game.currentTurn !== value || game.board[index] !== null) return;

        const isCorrectPlayer = (value === 'X' && game.players.X.name === name) ||
                                (value === 'O' && game.players.O.name === name);
        if (!isCorrectPlayer) return;

        game.board[index] = value;
        game.moves++;
        game.currentTurn = value === "X" ? "O" : "X";

        io.to(roomId).emit("playing", {
            board: game.board,
            currentTurn: game.currentTurn
        });
    });

    socket.on("gameOver", ({ roomId, name }) => {
        const game = games[roomId];
        if (game && (game.players.X.name === name || game.players.O.name === name)) {
            io.to(roomId).emit("gameOver", { message: `${name} ended the game.` });
            delete games[roomId];
        }
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
        waitingPlayers = waitingPlayers.filter(p => p.id !== socket.id);

        for (const roomId in games) {
            const game = games[roomId];
            if (game.players.X.id === socket.id || game.players.O.id === socket.id) {
                io.to(roomId).emit("gameOver", { message: `${socket.playerName || "A player"} disconnected.` });
                delete games[roomId];
            }
        }
    });
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

server.listen(3000, () => {
    console.log("✅ Server running on http://localhost:3000");
});
