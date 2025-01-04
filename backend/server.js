const express = require("express");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const { createAdapter } = require('@socket.io/redis-adapter');
const { Redis } = require('ioredis');
require("dotenv").config();
const os = require('os');

// import { ChatRoom } from "./utils/rooms";

const {
  addUser,
  deleteUser,
  getUserById,
  getUsersInRoom,
  assignRoomToUser,
  removeRoomFromUser,
  getUsers,
} = require("./utils/users");
const {
  createChatRoom,
  deleteChatRoom,
  getChatRooms,
} = require("./utils/rooms");



const pubClient = new Redis({
  host: process.env.REDIS_ENDPOINT, port: 6379
 });
const subClient = pubClient.duplicate();

pubClient.on("error", (err) => {
  console.error("[Redis pubClient Error]:", err);
});

subClient.on("error", (err) => {
  console.error("[Redis subClient Error]:", err);
});

const io = new Server(http, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.adapter(createAdapter(pubClient, subClient));


io.on("connection", (socket) => {
  console.log(`New WebSocket connection: ${socket.id}`);

  socket.on("createUser", (username, callback) => {
    const { error } = addUser({ id: socket.id, username });

    if (error) {
      console.error("Creating user failed:", error.cause);
      return callback(error.userMessage);
    }
    callback();
  });

  socket.on("getChatRoomsInfo", (callback) => {
    const response = _getChatRoomsInfo();

    callback(response);
  });

  socket.on("createChatRoom", (roomName, callback) => {
    const { error } = createChatRoom(socket.id, roomName);

    if (error) {
      console.error("Creating chat room failed:", error.cause);
      return callback(error.message);
    }

    const updatedChatRooms = _getChatRoomsInfo();
    io.emit("updatedChatRooms", updatedChatRooms);

    callback();
  });

  socket.on("deleteChatRoom", (roomName, callback) => {
    const room = deleteChatRoom(roomName);

    if (!room) {
      console.error(
        `Could not delete room because the room with the name '${roomName}' was not found.`
      );
      callback(
        "An unexpected error occured when trying to delete the chat room."
      );
    }

    const updatedChatRooms = _getChatRoomsInfo();
    io.emit("updatedChatRooms", updatedChatRooms);

    callback();
  });

  socket.on("joinChatRoom", (roomName, callback) => {
    const { error, user } = assignRoomToUser(socket.id, roomName);

    if (error) {
      console.error("Joining chat room failed:", error.cause);
      return callback(error.userMessage);
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
      console.error("Leaving chat room failed:", error.cause);
      return callback(error.userMessage);
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
    const user = getUserById(socket.id);
    const hostname = os.hostname();

    if (!user) {
      return;
    }

    console.log(`message from ${user.username}: ${message}`);
    message = message + " hello" + hostname
    io.to(user.roomName).emit("chatMessage", {
      username: user.username,
      message,
    });
  });

  socket.on("disconnect", () => {
    console.log(`websocket connection disconnected: ${socket.id}`);

    const user = deleteUser(socket.id);

    if (!user) {
      console.error(
        `Could not delete user because the user with the Socket ID '${socket.id}' was not found.`
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

app.get('/health', (req, res) => {
  const redisStatus = pubClient.status === 'ready';
  if (!redisStatus) {
      return res.status(500).send('Redis is not ready');
  }

  res.status(200).send('OK');
});


// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`server runs on port ${PORT}`);
});
