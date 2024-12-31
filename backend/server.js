const express = require('express');
const app = express();
const http = require('http').createServer(app);
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { Redis } = require('ioredis');
require('dotenv').config();

// Redis-Verbindung einrichten
const pubClient = new Redis({
 host: process.env.REDIS_ENDPOINT, port: 6379 // z.B. "redis://live-chat-redis-cluster.xxxxxx.ng.0001.use1.cache.amazonaws.com:6379"
});
const subClient = pubClient.duplicate();


// Nach der Erstellung des Redis-Clients
pubClient.on("error", (err) => {
  console.error("[Redis pubClient Error]:", err);
});

subClient.on("error", (err) => {
  console.error("[Redis subClient Error]:", err);
});


// Socket.io mit Redis-Adapter konfigurieren
const io = new Server(http, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});
io.adapter(createAdapter(pubClient, subClient));

// Socket.io Events
io.on('connection', (socket) => {
  let username;
  console.log(`Client ${socket.id} connected to process ${process.pid}`);

  socket.on('joinChat', (name) => {
    if (!username) {
      username = name;
      console.log(`${username} has joined the chat.`);
      socket.broadcast.emit('userJoined', username);
    }
  });

  socket.on('chatMessage', (msg) => {
    console.log(`Process ${process.pid} received message from ${username}: ${msg}`);
    console.log(`Process ${process.pid} received message from ${username}: ${JSON.stringify(msg)}`);
    io.emit('chatMessage', { username: username, message: msg });
  });

  socket.on('disconnect', () => {
    console.log(`websocket connection disconnected: ${socket.id}`);
    if (username) {
      console.log(`${username} has left the chat.`);
      socket.broadcast.emit('userLeft', username);
    }
  });
});

// Server starten
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`server runs on port ${PORT}`);
});
