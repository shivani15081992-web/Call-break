const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const rooms = {};

io.on('connection', (socket) => {
    socket.on('joinRoom', ({ roomId, playerName }) => {
        socket.join(roomId);
        if (!rooms[roomId]) {
            rooms[roomId] = { players: [], started: false };
        }

        const room = rooms[roomId];
        if (room.players.length < 4 && !room.started) {
            room.players.push({ id: socket.id, name: playerName, seat: room.players.length });
            io.to(roomId).emit('roomUpdate', room.players);

            if (room.players.length === 4) {
                room.started = true;
                const deck = createAndShuffleDeck();
                room.players.forEach((p, index) => {
                    const hand = deck.slice(index * 13, (index + 1) * 13);
                    io.to(p.id).emit('gameStart', { seat: index, hand, players: room.players });
                });
            }
        }
    });

    socket.on('submitBid', ({ roomId, seat, bid }) => {
        io.to(roomId).emit('playerBid', { seat, bid });
    });

    socket.on('playCard', ({ roomId, seat, card }) => {
        io.to(roomId).emit('cardPlayed', { seat, card });
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
            io.to(roomId).emit('roomUpdate', rooms[roomId].players);
        }
    });
});

function createAndShuffleDeck() {
    const SUITS = ['♠', '♥', '♣', '♦'];
    const VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    let deck = [];
    SUITS.forEach(s => VALUES.forEach(v => deck.push({ suit: s, val: v })));
    return deck.sort(() => Math.random() - 0.5);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
