const express = require("express");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
require("dotenv").config();

// import { ChatRoom } from "./utils/rooms";

const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require("./utils/users");
const { createChatRoom, getChatRooms } = require("./utils/rooms");

const io = new Server(http, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log(`New WebSocket connection: ${socket.id}`);

  socket.on("getChatRoomsInfo", (callback) => {
    const allChatRooms = getChatRooms();

    const response = allChatRooms.map((room) => ({
      userCount: getUsersInRoom(room.name).length,
      ...room,
    }));
    response.forEach((item) => {
      console.log(item);
    });
    callback(response);
  });

  socket.on("createChatRoom", (roomName, callback) => {
    const { error } = createChatRoom(roomName);

    if (error) {
      return callback(error);
    }
    callback();
  });

  socket.on("joinChatRoom", (options, callback) => {
    const { error, user } = addUser({ id: socket.id, ...options });

    if (error) {
      return callback(error);
    }

    socket.join(user.roomName);

    console.log(`${user.username} has joined the chat.`);
    // socket.emit('message', 'Welcome!')
    socket.broadcast.to(user.roomName).emit("userJoined", user.username);

    callback();
  });

  socket.on("chatMessage", (message) => {
    const user = getUser(socket.id);

    if (!user) {
      return;
    }

    console.log(`message from ${user.username}: ${message}`);

    io.to(user.roomName).emit("chatMessage", {
      username: user.username,
      message,
    });
  });

  socket.on("disconnect", () => {
    console.log(`websocket connection disconnected: ${socket.id}`);

    const user = removeUser(socket.id);

    if (user) {
      console.log(`${user.username} has left the chat.`);
      // TODO: Refactoring: io.to(user.room).emit('message', `${user.username} has left!`)
      io.to(user.roomName).emit("userLeft", user.username);
    }
  });
});

// start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`server runs on port ${PORT}`);
});
