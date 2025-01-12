// TODO: Aufruf von _getChatRoomsInfo() prüfen (Fehlerbehandlung...)

const express = require("express");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { Redis } = require("ioredis");
require("dotenv").config();

// import { ChatRoom } from "./utils/rooms";

const {
  createUser,
  deleteUser,
  assignRoomToUser,
  removeRoomFromUser,
  fetchUserById,
  fetchUsersInRoom,
} = require("./utils/users/users");

const {
  createChatRoom,
  deleteChatRoom,
  fetchChatRooms,
  fetchChatRoomByName,
  deleteChatRoomsWithOwner,
} = require("./utils/chat-rooms/chat-rooms");

const pubClient = new Redis({
  host: "redis-12501.c55.eu-central-1-1.ec2.redns.redis-cloud.com",
  port: 12501,
  // User: "default",
  password: "bwI3sry6Ye568AkcipJfpd6pQsb5ybNZ",
  maxRetriesPerRequest: 100,
  // connectTimeout: 10000,
  // commandTimeout: 5000,

  // host: process.env.REDIS_ENDPOINT,
  // port: 6379,
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

  socket.on("createUser", async (username, callback) => {
    try {
      await createUser({ id: socket.id, username });
      callback();
    } catch (error) {
      console.error("Creating user failed:", error.cause || error);

      // TODO: Benutzer-Fehlermeldung erzeugen und ausgeben
      return callback(
        error.userErrorMessage ||
          "Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu und versuchen es erneut."
      );
    }
  });

  socket.on("getChatRoomsInfo", (callback) => {
    _getChatRoomsInfo()
      .then((roomsInfo) => {
        return callback(roomsInfo);
      })
      .catch((error) => {
        console.error("Getting chat rooms info failed:", error);
        return callback(error);
      });
  });

  socket.on("createChatRoom", async (roomName, callback) => {
    try {
      await createChatRoom({ name: roomName, ownerId: socket.id });
    } catch (error) {
      console.error(
        `Creating chat room '${roomName}' failed:`,
        error.cause || error
      );
      return callback(
        error.userMessage || "Ein unerwarteter Fehler ist aufgetreten."
      );
    }

    _getChatRoomsInfo()
      .then((roomsInfo) => {
        io.emit("updatedChatRooms", roomsInfo);
        return callback();
      })
      .catch((error) => {
        console.error("Getting chat rooms info failed:", error);
        return callback(error);
      });
  });

  socket.on("deleteChatRoom", async (roomName, callback) => {
    let room = null;
    try {
      room = await fetchChatRoomByName(roomName);
    } catch (error) {
      `Could not delete the chat room '${roomName}' because an error occured while tryig to fetch the chat room with the name '${roomName}' from the database:`,
        { cause: error };
      return callback(
        "Der Chatroom konnte nicht gelöscht werden, weil ein unerwarteter Fehler aufgetreten ist."
      );
    }

    // Check if the user is the owner and therefore allowed to delete the chat room
    if (socket.id !== room.ownerId) {
      return callback(
        "Der Chatroom konnte nicht gelöscht werden, weil ein unerwarteter Fehler aufgetreten ist."
      );
    }

    try {
      await deleteChatRoom(roomName);
    } catch (error) {
      console.error("Deleting chat room failed:", error);
      return callback(
        "Der Chatroom konnte nicht gelöscht werden, weil ein unerwarteter Fehler aufgetreten ist."
      );
    }

    const updatedChatRooms = await _getChatRoomsInfo();
    io.emit("updatedChatRooms", updatedChatRooms);

    callback();
  });

  socket.on("joinChatRoom", async (roomName, callback) => {
    let user = null;

    try {
      user = await assignRoomToUser(socket.id, roomName);
    } catch (error) {
      console.error(
        `Assigning room '${roomName}' to user with ID '${socket.id}' failed:`,
        error.cause || error
      );
      return callback(
        error.userMessage ||
          "Der Chatroom konnte nicht beigetreten werden, weil ein unerwarteter Fehler aufgetreten ist."
      );
    }

    socket.join(user.roomName);

    socket.emit("message", `Welcome to the chat room '${roomName}'!`);
    socket.broadcast.to(user.roomName).emit("userJoined", user.username);

    const updatedChatRooms = await _getChatRoomsInfo();
    socket.broadcast.emit("updatedChatRooms", updatedChatRooms);

    callback();
  });

  socket.on("leaveChatRoom", async (roomName, callback) => {
    let user = null;
    try {
      user = await removeRoomFromUser(socket.id, roomName);
    } catch (error) {
      console.error("Leaving chat room failed:", error.cause | error);
      return callback(
        error.userMessage ||
          "Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu."
      );
    }

    socket.leave(user.roomName);
    socket.broadcast.to(roomName).emit("userLeft", user.username);

    _getChatRoomsInfo()
      .then((roomsInfo) => {
        socket.broadcast.emit("updatedChatRooms", roomsInfo);
        return callback();
      })
      .catch((error) => {
        console.error("Getting chat rooms info failed:", error);
        return callback(error);
      });
  });

  socket.on("chatMessage", async (message) => {
    let user = null;
    let error = null;

    try {
      user = await fetchUserById(socket.id);
    } catch (err) {
      console.error(
        "Linked user of received chat message could not be fetched:",
        error
      );
      error = err;
    }

    if (!user || error) {
      return;
    }

    io.to(user.roomName).emit("chatMessage", {
      username: user.username,
      message,
    });
  });

  socket.on("disconnect", async () => {
    console.log(`WebSocket connection disconnected: ${socket.id}`);

    let deletedUser = null;
    try {
      deletedUser = await deleteUser(socket.id);
      await deleteChatRoomsWithOwner(socket.id);
    } catch (error) {
      console.error(
        `Deleting disconnecting user with ID '${socket.id}' failed:`,
        error
      );
    }

    const updatedChatRooms = await _getChatRoomsInfo();
    io.emit("updatedChatRooms", updatedChatRooms);
  });
});

async function _getChatRoomsInfo() {
  let chatRoomsInfo = [];

  let allChatRooms = [];
  try {
    allChatRooms = await fetchChatRooms();
  } catch (error) {
    console.error(`Getting info for chat room '${roomName}' failed:`, error);
    throw error;
  }

  chatRoomsInfo = await Promise.all(
    allChatRooms.map(async (room) => {
      try {
        const users = await fetchUsersInRoom(room.name);
        return { userCount: users.length, ...room };
      } catch (error) {
        console.error(`Fetching users in room '${room.name}' failed:`, error);
        return { userCount: null, ...room };
      }
    })
  );

  return chatRoomsInfo;
}

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`server runs on port ${PORT}`);
});
