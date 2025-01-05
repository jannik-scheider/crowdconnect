// export interface User {
//   id: string;
//   username: string;
//   roomName?: string;
// }

const {
  fetchItem,
  fetchItemsByAttributeValue,
  addItem,
  removeItem,
  setItemAttribute,
  removeItemAttribute,
} = require("../../dynamodb.js");

const { validateChatRoomExists } = require("../chat-rooms/validations.js");

const {
  validateUserNotExists,
  validateUsernameNotExists,
  UserValidationError,
  InputValidationError,
} = require("./validations.js");

const TABLE_NAME = "Users";

const createUser = async ({ id: userId, username }) => {
  // Clean username
  username = username.trim().toLowerCase();

  // Validate username
  if (!username) {
    throw new UserValidationError(
      "Could not create user because the given username is empty.",
      "Username must not be empty!"
    );
  }

  // Check for existing user
  try {
    validateUserNotExists(userId);
  } catch (error) {
    throw new Error("Creating user failed:", { cause: error });
  }

  // Check for existing username
  try {
    validateUsernameNotExists(username);
  } catch (error) {
    throw new Error("Creating user failed:", { cause: error });
  }

  // Store user
  const user = { id: userId, username };
  return addItem(TABLE_NAME, user);
};

const deleteUser = (userId) => {
  return removeItem(TABLE_NAME, { id: userId });
};

const assignRoomToUser = async (userId, roomName) => {
  // Validate room name
  if (!roomName) {
    throw new UserValidationError(
      `Could not assign room to the user with the ID '${userId}' because the given room name is empty.`
    );
  }

  // Clean room name
  roomName = roomName.trim().toLowerCase();

  // Check for existing chat room
  validateChatRoomExists(roomName);

  const user = await setItemAttribute(
    TABLE_NAME,
    { id: userId },
    "roomName",
    roomName
  );

  return user;
};

const removeRoomFromUser = async (userId, roomName) => {
  // Validate the data
  if (!userId || !roomName) {
    throw {
      userMessage:
        "Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu und versuchen es erneut.",
      cause: `Cannot remove room '${roomName}' from the user with the ID '${id}' because either the given user ID or room name is empty.`,
    };
  }

  // Clean room name
  roomName = roomName.trim().toLowerCase();

  let user = null;
  try {
    user = await removeItemAttribute(TABLE_NAME, { id: userId }, "roomName");
  } catch (error) {
    // TODO: Überarbeiten

    console.error(
      `Removing room '${roomName}' from user with ID '${userId}' failed:`,
      error
    );
    throw {
      userMessage:
        "Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu und versuchen es erneut.",
      cause: `Could not remove room '${roomName}' from the user with the ID '${id}':`,
      error,
    };
  }

  return user;
};

const fetchUserById = (userId) => {
  return fetchItem(TABLE_NAME, { id: userId });
};

const _fetchUsersByUsername = (username) => {
  return fetchItemsByAttributeValue(TABLE_NAME, "username", username).catch(
    (error) => {
      console.error("Fetching users by username failed:", error);
      throw error;
    }
  );
};

const fetchUsersInRoom = (roomName) => {
  return fetchItemsByAttributeValue(TABLE_NAME, "roomName", roomName).catch(
    (error) => {
      console.error(`Fetching users in room '${roomName}' failed: `, error);
      throw error;
    }
  );
};

module.exports = {
  createUser,
  deleteUser,
  assignRoomToUser,
  removeRoomFromUser,
  fetchUserById,
  fetchUsersInRoom,
};
