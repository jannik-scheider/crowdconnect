const express = require('express');
const app = express();
const http = require('http').createServer(app);
const { Server } = require('socket.io');
require('dotenv').config();


const io = new Server(http, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});



io.on('connection', (socket) => {
  let username;
  let hasDisconnected = false; // Initialized for each connection

  console.log(`new websocket connection: ${socket.id}`);

  socket.on('joinChat', (name) => {
    if (!username) {
      username = name;
      console.log(`${username} has joined the chat.`);
      socket.broadcast.emit('userJoined', username);
    }
  });

  socket.on('chatMessage', (msg) => {
    console.log(`message from ${username}: ${msg}`);
    io.emit('chatMessage', { username: username, message: msg });
  });

  socket.on('disconnect', () => {
    console.log(`websocket connection disconnected: ${socket.id}`);
    if (username && !hasDisconnected) { // Ensure that it is only sent once
      hasDisconnected = true;
      console.log(`${username} has left the chat.`);
      socket.broadcast.emit('userLeft', username);
    }
  });
});


// start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`server runs on port ${PORT}`);
});
