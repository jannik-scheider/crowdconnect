// export interface ChatRoom {
//   name: string;
//   ownerId: String;
// }

const {
  fetchItem,
  fetchAllItems,
  addItem,
  removeItem,
} = require("../../dynamodb.js");
// const { validateUserExists } = require("../users/validations.js");

const TABLE_NAME = "ChatRooms";

const createChatRoom = async ({ name: roomName, ownerId }) => {
  // Validate owner
  if (!ownerId) {
    throw {
      userMessage:
        "An unexpected error occurred when trying to create the chat room. Please refresh the page and try again.",
      cause: "Cannot create chat room because the given owner ID is empty.",
    };
  }

  // validateUserExists(ownerId);

  // Clean chat room name
  roomName = roomName.trim().toLowerCase();

  // Validate room name
  if (!roomName) {
    throw {
      userMessage: "Room name is required!",
      cause: "Cannot create chat room because the given room name is empty.",
    };
  }

  // Check for existing room
  let existingChatRoom = null;
  try {
    existingChatRoom = await fetchChatRoomByName(roomName);
  } catch (error) {
    console.error(`Creating chat room '${roomName}' failed:`, error);
    throw error;
  }

  // Validate room name
  if (existingChatRoom) {
    throw {
      userMessage: `A chatroom with the name ${roomName} does already exist! Please provide another name.`,
      cause: `Cannot crate chat room '${roomName}' because a chat room with the name '${roomName}' does already exist.`,
    };
  }

  // Store room
  const room = { name: roomName, ownerId };
  return addItem(TABLE_NAME, room).catch((error) => {
    console.error(`Creating chat room '${roomName}' failed:`, error);
    throw error;
  });
};

const deleteChatRoom = (roomName) => {
  return removeItem(TABLE_NAME, { roomName }).catch((error) => {
    console.error(`Deleting chat room '${roomName}' failed:`, error);
    throw error;
  });
};

const fetchChatRoomByName = (roomName) => {
  return fetchItem(TABLE_NAME, { name: roomName }).catch((error) => {
    console.error(`Fetching chat room by name '${roomName}' failed:`, error);
    throw error;
  });
};

const fetchChatRooms = () => {
  return fetchAllItems(TABLE_NAME).catch((error) => {
    console.error("Fetching chat rooms failed:", error);
    throw error;
  });
};

module.exports = {
  createChatRoom,
  deleteChatRoom,
  fetchChatRoomByName,
  fetchChatRooms,
};
