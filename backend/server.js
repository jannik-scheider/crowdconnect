const express = require('express');
const app = express();
const http = require('http').createServer(app);
const { Server } = require('socket.io');
const path = require('path');

// CORS-Optionen für Socket.IO
const io = new Server(http, {
  cors: {
    origin: "https://d3cxcbono3qgzq.cloudfront.net", // Frontend-Port
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Statische Dateien servieren
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  let username;
  let hasDisconnected = false; // Wird für jede Verbindung initialisiert

  console.log(`Neuer WebSocket verbunden: ${socket.id}`);

  socket.on('joinChat', (name) => {
    if (!username) { // Nur senden, wenn username noch nicht gesetzt ist
      username = name;
      console.log(`${username} hat den Chat betreten.`);
      socket.broadcast.emit('userJoined', username);
    }
  });

  socket.on('chatMessage', (msg) => {
    console.log(`Nachricht von ${username}: ${msg}`);
    io.emit('chatMessage', { username: username, message: msg });
  });

  socket.on('disconnect', () => {
    console.log(`WebSocket Verbindung getrennt: ${socket.id}`);
    if (username && !hasDisconnected) { // Sicherstellen, dass nur einmal gesendet wird
      hasDisconnected = true;
      console.log(`${username} hat den Chat verlassen.`);
      socket.broadcast.emit('userLeft', username);
    }
  });
});


// Server starten
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});
