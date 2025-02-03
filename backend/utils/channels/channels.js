// export interface Channel {
//   name: string;
//   ownerId: String;
// }

const {
  fetchItem,
  fetchItemsByAttributeValue,
  fetchAllItems,
  addItem,
  removeItem,
  setItemAttribute,
} = require("../../dynamodb.js");

const EventEmitter = require("events");

class MyEmitter extends EventEmitter {}
const channelsEmitter = new MyEmitter();

const TABLE_NAME = "Channels";

const fetchChannelByName = (channelName) => {
  return fetchItem(TABLE_NAME, { name: channelName }).catch((error) => {
    console.error(`Fetching channel by name '${channelName}' failed:`, error);
    throw error;
  });
};

const fetchChannels = () => {
  return fetchAllItems(TABLE_NAME).catch((error) => {
    console.error("Fetching channels failed:", error);
    throw error;
  });
};

const setIsLiveAttributeValue = async (channelName, value) => {
  // Validate channel name
  if (!channelName) {
    throw new UserValidationError(
      `Could not set isLive attribute value to the channel with the name '${channelName}' because the given channel name is empty.`
    );
  }

  // Clean channel name
  channelName = channelName.trim().toLowerCase();

  // Check for existing channel
  // TODO
  // await validateChannelExists(channelName);

  const channel = await setItemAttribute(
    TABLE_NAME,
    { name: channelName },
    "isLive",
    value
  );

  return channel;
};

const createChannel = async ({ name: channelName, ownerId, isLive }) => {
  // Validate owner
  if (!ownerId) {
    throw {
      userMessage:
        "An unexpected error occurred when trying to create the channel. Please refresh the page and try again.",
      cause: "Cannot create channel because the given owner ID is empty.",
    };
  }

  // Clean channel name
  channelName = channelName.trim().toLowerCase();

  // Validate channel name
  if (!channelName) {
    throw {
      userMessage: "Channel name is required!",
      cause: "Cannot create channel because the given channel name is empty.",
    };
  }

  // Check for existing channel
  let existingChannel = null;
  try {
    existingChannel = await fetchChannelByName(channelName);
  } catch (error) {
    console.error(`Creating channel '${channelName}' failed:`, error);
    throw error;
  }

  // Validate channel name
  if (existingChannel) {
    throw {
      userMessage: `A channel with the name ${channelName} does already exist! Please provide another name.`,
      cause: `Cannot crate channel '${channelName}' because a channel with the name '${channelName}' does already exist.`,
    };
  }

  // Store channel
  const channel = { name: channelName, ownerId, isLive };
  return addItem(TABLE_NAME, channel).catch((error) => {
    console.error(`Creating channel '${channelName}' failed:`, error);
    throw error;
  });
};

const deleteChannel = (channelName) => {
  return removeItem(TABLE_NAME, { name: channelName })
    .then(({ name }) => {
      channelsEmitter.emit("deletedChannel", name);
    })
    .catch((error) => {
      console.error(`Deleting channel '${channelName}' failed:`, error);
      throw error;
    });
};

const deleteChannelsWithOwner = async (ownerId) => {
  let channels = [];

  try {
    channels = await fetchItemsByAttributeValue(TABLE_NAME, "ownerId", ownerId);
  } catch (error) {
    console.error(
      `Deleting channels with owner with ID '${ownerId}' failed:`,
      error
    );
    throw error;
  }

  const deletePromises = channels.map(({ name: channelName }) => {
    deleteChannel(channelName);
  });

  await Promise.all(deletePromises);
};

module.exports = {
  channelsEmitter,
  fetchChannelByName,
  fetchChannels,
  setIsLiveAttributeValue,
  createChannel,
  deleteChannel,
  deleteChannelsWithOwner,
};
