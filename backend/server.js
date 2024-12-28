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
  assignRoomToUser,
  removeRoomFromUser,
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

  socket.on("createUser", (username, callback) => {
    console.log("createuser");
    const { error } = addUser({ id: socket.id, username });

    if (error) {
      return callback(error);
    }
    callback();
  });

  socket.on("getChatRoomsInfo", (callback) => {
    const response = _getChatRoomsInfo();

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

    const updatedChatRooms = _getChatRoomsInfo();
    io.emit("updatedChatRooms", updatedChatRooms);

    callback();
  });

  socket.on("joinChatRoom", (roomName, callback) => {
    const { error, user } = assignRoomToUser(socket.id, roomName);

    if (error) {
      return callback("An error occurred when trying to join the chat room!");
    }

    socket.join(user.roomName);

    console.log(`${user.username} has joined the chat room ${roomName}.`);
    // socket.emit('message', 'Welcome!')
    socket.broadcast.to(user.roomName).emit("userJoined", user.username);

    const updatedChatRooms = _getChatRoomsInfo();
    socket.broadcast.emit("updatedChatRooms", updatedChatRooms);

    callback();
  });

  socket.on("leaveChatRoom", (roomName, callback) => {
    const { error, user } = removeRoomFromUser(socket.id, roomName);

    if (error) {
      return callback("An error occurred when trying to leave the chat room!");
    }

    socket.leave(user.roomName);

    // TODO: Refactoring: io.to(user.room).emit('message', `${user.username} has left!`)
    console.log(`${user.username} has left the chat room '${roomName}'.`);
    socket.broadcast.to(roomName).emit("userLeft", user.username);

    const updatedChatRooms = _getChatRoomsInfo();
    socket.broadcast.emit("updatedChatRooms", updatedChatRooms);

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

    if (!user) {
      console.log(
        `Could not delete user because the user with the ID '${socket.id}' was not found.`
      );
    }
  });
});

function _getChatRoomsInfo() {
  const allChatRooms = getChatRooms();

  return allChatRooms.map((room) => ({
    userCount: getUsersInRoom(room.name).length,
    ...room,
  }));
}

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`server runs on port ${PORT}`);
});
