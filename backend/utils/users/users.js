// export interface User {
//   id: string;
//   username: string;
//   channelName?: string;
// }

const {
  fetchItem,
  fetchItemsByAttributeValue,
  addItem,
  removeItem,
  setItemAttribute,
  removeItemAttribute,
} = require("../../dynamodb.js");

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

  // Check for existing user and username
  try {
    await Promise.all([
      validateUserNotExists(userId),
      validateUsernameNotExists(username),
    ]);
  } catch (error) {
    throw new Error("Creating user failed:", { cause: error });
  }

  // Store user
  const user = { id: userId, username };
  return addItem(TABLE_NAME, user);
};

const deleteUser = async (userId) => {
  const deletedUser = await removeItem(TABLE_NAME, { id: userId });

  if (!deletedUser) {
    throw new Error(
      `Could not delete user because the user with the user ID '${userId}' was not found.`
    );
  }
};

const removeChannelFromUser = async (userId, channelName) => {
  // Validate the data
  if (!userId || !channelName) {
    throw {
      userMessage:
        "Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu und versuchen es erneut.",
      cause: `Cannot remove channel '${channelName}' from the user with the ID '${id}' because either the given user ID or channel name is empty.`,
    };
  }

  // Clean channel name
  channelName = channelName.trim().toLowerCase();

  let user = null;
  try {
    // TODO: Heißt das Datenbankattribut nicht "name"?
    user = await removeItemAttribute(TABLE_NAME, { id: userId }, "channelName");
  } catch (error) {
    // TODO: Überarbeiten

    console.error(
      `Removing channel '${channelName}' from user with ID '${userId}' failed:`,
      error
    );
    throw {
      userMessage:
        "Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu und versuchen es erneut.",
      cause: `Could not remove channel '${channelName}' from the user with the ID '${id}':`,
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

module.exports = {
  createUser,
  deleteUser,
  removeChannelFromUser,
  fetchUserById,
};
