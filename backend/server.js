const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Statische Dateien servieren
app.use(express.static(path.join(__dirname, 'public')));

// Socket.io-Verbindung
io.on('connection', (socket) => {
    let username;

    // Nutzer tritt dem Chat bei
    socket.on('joinChat', (name) => {
        username = name;
        socket.broadcast.emit('userJoined', username);
    });

    // Nachricht empfangen und senden
    socket.on('chatMessage', (msg) => {
        io.emit('chatMessage', { username: username, message: msg });
    });

    // Nutzer verlässt den Chat
    socket.on('disconnect', () => {
        if (username) {
            socket.broadcast.emit('userLeft', username);
        }
    });
});

// Server starten
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});
