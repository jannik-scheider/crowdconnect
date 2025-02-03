const express = require("express");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { Redis } = require("ioredis");
require("dotenv").config();
const os = require("os");

// import { Channel } from "./utils/channels";

const {
  createUser,
  deleteUser,
  assignChannelToUser,
  removeChannelFromUser,
  fetchUserById,
  fetchUsersInChannel,
} = require("./utils/users/users");

const {
  channelsEmitter,
  fetchChannels,
  fetchChannelByName,
  createChannel,
  setIsLiveAttributeValue,
  deleteChannel,
  deleteChannelsWithOwner,
} = require("./utils/channels/channels");

const pubClient = new Redis({
  host: "redis-12501.c55.eu-central-1-1.ec2.redns.redis-cloud.com",
  port: 12501,
  // User: "default",
  username: "default",
  password: "bwI3sry6Ye568AkcipJfpd6pQsb5ybNZ",
  maxRetriesPerRequest: 100,
  // connectTimeout: 10000,
  // commandTimeout: 5000,

  // host: process.env.REDIS_ENDPOINT,
  // port: 6379,
});
const subClient = pubClient.duplicate();

const io = new Server(http, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
  adapter: createAdapter(pubClient, subClient),
});

pubClient.on("error", (err) => {
  console.error("[Redis pubClient Error]:", err);
});

subClient.on("error", (err) => {
  console.error("[Redis subClient Error]:", err);
});

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

  socket.on("getChannelsInfo", (callback) => {
    _getChannelsInfo()
      .then((channelsInfo) => {
        return callback(channelsInfo);
      })
      .catch((error) => {
        console.error("Getting channels info failed:", error);
        return callback(
          "Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu und versuchen es erneut."
        );
      });
  });

  socket.on("createChannel", async (channelName, callback) => {
    let newChannel = null;
    try {
      newChannel = await createChannel({
        name: channelName,
        ownerId: socket.id,
        isLive: false,
      });
    } catch (error) {
      console.error(
        `Creating channel '${channelName}' failed:`,
        error.cause || error
      );
      return callback(
        error.userMessage || "Ein unerwarteter Fehler ist aufgetreten."
      );
    }

    _getChannelsInfo()
      .then((channelsInfo) => {
        // Benutzer sollen nur Live-Kanäle angezeigt bekommen
        socket.emit("updatedChannels", channelsInfo);
        return callback();
      })
      .catch((error) => {
        console.error(`Creating channel '${channelName}' failed:`, error);
        return callback(
          "Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu und versuchen es erneut."
        );
      });
  });

  socket.on("deleteChannel", async (channelName, callback) => {
    let channel = null;
    try {
      channel = await fetchChannelByName(channelName);
    } catch (error) {
      console.error(
        `Could not delete the channel '${channelName}' because an error occured while tryig to fetch the channel with the name '${channelName}' from the database:`,
        error
      );
      return callback(
        "Der Channel konnte nicht gelöscht werden, weil ein unerwarteter Fehler aufgetreten ist."
      );
    }

    // Check if the user is the owner and therefore allowed to delete the channel
    if (socket.id !== channel.ownerId) {
      return callback(
        "Der Channel konnte nicht gelöscht werden, weil ein unerwarteter Fehler aufgetreten ist."
      );
    }

    try {
      await deleteChannel(channelName);
    } catch (error) {
      console.error("Deleting channel failed:", error);
      return callback(
        "Der Channel konnte nicht gelöscht werden, weil ein unerwarteter Fehler aufgetreten ist."
      );
    }

    _getChannelsInfo()
      .then((channelsInfo) => {
        io.emit("updatedChannels", channelsInfo);
        return callback();
      })
      .catch((error) => {
        console.error(`Deleting channel '${channelName}' failed:`, error);
        return callback(
          "Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu und versuchen es erneut."
        );
      });
  });

  socket.on("joinChannel", async (channelName, callback) => {
    let user = null;

    try {
      user = await assignChannelToUser(socket.id, channelName);
      await setIsLiveAttributeValue(channelName, true);
    } catch (error) {
      console.error(
        `Assigning channel '${channelName}' to user with ID '${socket.id}' failed:`,
        error.cause || error
      );
      return callback(
        error.userMessage ||
          "Der Channel konnte nicht beigetreten werden, weil ein unerwarteter Fehler aufgetreten ist."
      );
    }

    socket.join(user.channelName);

    socket.emit("message", `Welcome to the channel '${channelName}'!`);
    socket.broadcast.to(user.channelName).emit("userJoined", user.username);

    _getChannelsInfo()
      .then((channelsInfo) => {
        io.emit("updatedChannels", channelsInfo);
        return callback();
      })
      .catch((error) => {
        console.error(`Joining channel '${channelName}' failed:`, error);
        return callback(
          "Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu und versuchen es erneut."
        );
      });
  });

  socket.on("leaveChannel", async (channelName, callback) => {
    let user = null;
    try {
      user = await removeChannelFromUser(socket.id, channelName);
    } catch (error) {
      console.error("Leaving channel failed:", error.cause | error);
      return callback(
        error.userMessage ||
          "Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu."
      );
    }

    socket.leave(channelName);

    let channel = null;
    try {
      channel = await fetchChannelByName(channelName);
    } catch (error) {
      console.error(`Fetching channel '${channelName}' failed:`, error);
    }

    if (channel.ownerId === socket.id) {
      socket.broadcast.to(channelName).emit("channelOwnerLeft", user.username);
      await setIsLiveAttributeValue(channelName, false);
    } else {
      socket.broadcast.to(channelName).emit("userLeft", user.username);
    }

    _getChannelsInfo()
      .then((channelsInfo) => {
        io.emit("updatedChannels", channelsInfo);
        return callback();
      })
      .catch((error) => {
        console.error(`Leaving channel '${channelName}' failed:`, error);
        return callback(
          "Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu und versuchen es erneut."
        );
      });
  });

  socket.on("chatMessage", async (message) => {
    let user = null;
    let error = null;
    const hostname = os.hostname();

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

    message = message + hostname;
    io.to(user.channelName).emit("chatMessage", {
      username: user.username,
      message,
    });
  });

  socket.on("disconnect", async () => {
    console.log(`WebSocket connection disconnected: ${socket.id}`);

    try {
      await deleteUser(socket.id);
      await deleteChannelsWithOwner(socket.id);
    } catch (error) {
      console.error(
        `Deleting disconnecting user with ID '${socket.id}' failed:`,
        error
      );
    }

    // TODO: Keine try...catch-Fehlerbehandlung?
    const updatedChannels = await _getChannelsInfo();
    socket.broadcast.emit("updatedChannels", updatedChannels);
  });
});

channelsEmitter.on("deletedChannel", (channelName) => {
  io.to(channelName).emit("channelDeleted");
});

async function _getChannelsInfo() {
  let channelsInfo = [];

  let allChannels = [];
  try {
    allChannels = await fetchChannels();
  } catch (error) {
    console.error("Getting channels info failed:", error);
    throw error;
  }

  channelsInfo = await Promise.all(
    allChannels.map(async (channel) => {
      try {
        const usersWithoutOwner = (
          await fetchUsersInChannel(channel.name)
        ).filter((user) => user.id !== channel.ownerId);
        const owner = await fetchUserById(channel.ownerId);

        if (!owner) {
          throw new Error(
            `A user with the ID ${channel.ownerId} does not exist.`
          );
        }

        return {
          ownerName: owner.username,
          userCount: usersWithoutOwner.length,
          ...channel,
        };
      } catch (error) {
        console.error(
          `An error occured while trying to get the channels info:`,
          error
        );
        return { ownerName: "", userCount: null, ...channel };
      }
    })
  );

  return channelsInfo;
}

app.get("/health", (req, res) => {
  const redisStatus = pubClient.status === "ready";
  if (!redisStatus) {
    return res.status(500).send("Redis is not ready");
  }

  res.status(200).send("OK");
});

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`server runs on port ${PORT}`);
});
