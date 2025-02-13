const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const socketio = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const Redis = require("ioredis");
require("dotenv").config();
const os = require("os");

const {
  createUser,
  deleteUser,
  removeChannelFromUser,
  fetchUserById,
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


const app = express();
const httpServer = http.createServer();

const PORT = process.env.PORT || 3000;

const redisClient = new Redis({
  host: process.env.REDIS_ENDPOINT,
  port: 6379,
});

// const redisClient = new Redis({
//   host: "crowdconnect-cache-1wdwao.serverless.euc1.cache.amazonaws.com",
//   port: 6379,
//   // User: "default",
//   // username: "default",
//   // password: "bwI3sry6Ye568AkcipJfpd6pQsb5ybNZ",
//   maxRetriesPerRequest: 100,
//   // connectTimeout: 10000,
//   // commandTimeout: 5000,

//   // host: process.env.REDIS_ENDPOINT,
//   // port: 6379,
// });

const pubClient = redisClient.duplicate();
const subClient = redisClient.duplicate();

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
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
      callback({ status: "success", message: "user created" });
    } catch (error) {
      console.error("Creating user failed:", error.cause || error);

      // TODO: Benutzer-Fehlermeldung erzeugen und ausgeben
      callback({
        status: "error",
        message:
          error.userErrorMessage ||
          "Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu und versuchen es erneut.",
      });
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
    redisClient.get(channelName, (error, cachedData) => {
      if (error) {
        console.log("create channel error", error);
        return callback(
          "Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu und versuchen es erneut."
        );
      }
      if (cachedData) {
        socket.emit("updatedChannels", JSON.parse(cachedData));
      }
    });

    try {
      const channel = await createChannel({
        name: channelName,
        ownerId: socket.id,
        isLive: false,
      });

      if (channel) {
        redisClient.set(channel.name, JSON.stringify(channel));
      }
    } catch (error) {
      console.error(
        `Creating channel '${channelName}' failed:`,
        error.cause || error
      );
      return callback(
        error.userMessage || "Ein unerwarteter Fehler ist aufgetreten."
      );
    }

    redisClient.get("channelsInfo", (error, cachedData) => {
      if (error) {
        return callback(
          "Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu und versuchen es erneut."
        );
      }
      if (cachedData) {
        socket.emit("updatedChannels", JSON.parse(cachedData));
      }
    });

    _getChannelsInfo()
      .then((channelsInfo) => {
        // Benutzer sollen nur Live-Kanäle angezeigt bekommen
        console.log("channelsinfo", channelsInfo);

        redisClient.set("channelsInfo", JSON.stringify(channelsInfo));
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
      user = await fetchUserById(socket.id);
    } catch (error) {
      console.error(`Joining channel ${channelName} failed:`, error);
      return callback(
        "Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu und versuchen es erneut."
      );
    }

    // Clean channel name
    channelName = channelName.trim().toLowerCase();

    let channel = null;
    try {
      channel = await fetchChannelByName(channelName);
    } catch (error) {
      console.error(`Fetching channel '${channelName}' failed:`, error);
      return callback(
        "Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu und versuchen es erneut."
      );
    }

    if (channel.ownerId === socket.id) {
      try {
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
    }

    socket.join(channelName);

    socket.emit("message", `Welcome to the channel '${channelName}'!`);
    socket.broadcast.to(channelName).emit("userJoined", user.username);

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
      return console.error(`Fetching channel '${channelName}' failed:`, error);
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

  socket.on("chatMessage", async (data) => {
    let user = null;
    let error = null;
    const hostname = os.hostname();
    console.log(data.payload);
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

    message = data.payload.message + hostname;
    io.to(channelName).emit("chatMessage", {
      username: user.username,
      message: message,
      latency: data.payload.latency,
    });
  });

  socket.on("disconnect", async () => {
    console.log(`WebSocket connection disconnected: ${socket.id}`);

    try {
      deleteUser(socket.id);
      deleteChannelsWithOwner(socket.id);
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
  try {
    const allChannels = fetchChannels();

    const channelsInfo = await allChannels.then((channels) =>
      Promise.allSettled(channels.map(_getChannelInfos))
    );

    return channelsInfo.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      console.error(result.reason);
      return allChannels[index];
    });
  } catch (error) {
    console.error("Fetching channels info failed:", error);
    throw error;
  }
}

async function _getChannelInfos(channel) {
  try {
    const members = await io.in(channel.name).fetchSockets();
    const owner = await fetchUserById(channel.ownerId);

    if (!owner) {
      console.error(`User with ID ${channel.ownerId} not found.`);
      return { ownerName: null, userCount: members.length - 1, ...channel }; // userCount: Users without owner
    }

    return {
      ownerName: owner.username,
      userCount: members.length - 1,
      ...channel,
    };
  } catch (error) {
    console.error(`Error fetching info for channel ${channel.name}:`, error);
    return { ownerName: null, userCount: null, ...channel };
  }
}

app.get("/health", (req, res) => {
  const redisStatus = pubClient.status === "ready";
  if (!redisStatus) {
    return res.status(500).send("Redis is not ready");
  }

  res.status(200).send("OK");
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`server runs on port ${PORT}`);
});
