const express = require("express");
const app = express();
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.resolve("")));

let arr = [];
let playingArray = [];
let currentTurn = null; // Track whose turn it is

io.on("connection", (socket) => {
    socket.on("find", (e) => {
        if (e.name != null) {
            arr.push(e.name);

            if (arr.length >= 2) {
                let p1obj = {
                    p1name: arr[0],
                    p1value: "X",
                    p1move: ""
                };
                let p2obj = {
                    p2name: arr[1],
                    p2value: "O",
                    p2move: ""
                };

                let obj = {
                    p1: p1obj,
                    p2: p2obj,
                    sum: 1
                };

                playingArray.push(obj);
                currentTurn = 'X'; // X always starts

                arr.splice(0, 2);

                io.emit("find", { allPlayers: playingArray, currentTurn: currentTurn });
            }
        }
    });

    socket.on("playing", (e) => {
        let objToChange;

        // Validate player's turn
        if (e.value === "X" && currentTurn === 'X') {
            objToChange = playingArray.find(obj => obj.p1.p1name === e.name);
            if (objToChange) {
                objToChange.p1.p1move = e.id;
                currentTurn = 'O'; // Switch turn
            }
        } else if (e.value === "O" && currentTurn === 'O') {
            objToChange = playingArray.find(obj => obj.p2.p2name === e.name);
            if (objToChange) {
                objToChange.p2.p2move = e.id;
                currentTurn = 'X'; // Switch turn
            }
        }

        if (objToChange) {
            objToChange.sum++;
            io.emit("playing", { allPlayers: playingArray, currentTurn: currentTurn });
        }
    });

    socket.on("gameOver", (e) => {
        playingArray = playingArray.filter(obj => obj.p1.p1name !== e.name && obj.p2.p2name !== e.name);
        currentTurn = null; // Reset turn on game over
        io.emit("gameOver"); // Notify all clients about the game over
    });
});

app.get("/", (req, res) => {
    return res.sendFile(path.resolve("index.html"));
});

server.listen(3000, () => {
    console.log("Server running on port 3000");
});
