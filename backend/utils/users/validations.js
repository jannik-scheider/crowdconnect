const { fetchChatRoomByName } = require("../chat-rooms/chat-rooms.js");

// const { fetchUserById } = require("../users/users.js");

const {
  fetchItem,
  fetchItemsByAttributeValue,
  addItem,
  removeItem,
  setItemAttribute,
  removeItemAttribute,
} = require("../../dynamodb.js");

const TABLE_NAME = "Users";

const DEFAULT_USER_ERROR_MESSAGE =
  "Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu und versuchen es erneut.";

class UserValidationError extends Error {
  constructor(
    message,
    { userErrorMessage = DEFAULT_USER_ERROR_MESSAGE, cause } = {}
  ) {
    super(message, { cause });
    this.name = "ValidationError";
    this.userErrorMessage = userErrorMessage;
  }
}

class InputValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = "InputValidationError";
    this.field = field;
  }
}

const validateUserExists = async (userId) => {
  let existingUser = null;

  try {
    existingUser = await fetchItem(TABLE_NAME, { id: userId });
    // TODO
    // existingUser = await fetchUserById(userId);
  } catch (error) {
    throw new UserValidationError(
      `Could not validate that the owner with the ID '${userId}' exists because an error occured while tryig to fetch the user with the ID '${userId}' from the database:`,
      { cause: error }
    );
  }

  if (!existingUser) {
    throw new UserValidationError(
      `A user with the ID '${userId}' does not exist.`
    );
  }
};

const validateUserNotExists = async (userId) => {
  let existingUser = null;

  try {
    existingUser = await fetchItem(TABLE_NAME, { id: userId });
    // TODO
    // existingUser = await fetchUserById(userId);
  } catch (error) {
    throw new UserValidationError(
      `Could not validate that the user with the ID '${userId}' does not exist because an error occured while tryig to fetch the user with the ID '${userId}' from the database:`,
      { cause: error }
    );
  }

  if (existingUser) {
    console.log("ex user", existingUser);
    throw new UserValidationError(
      `A user with the ID '${userId}' does already exist.`
    );
  }
};

const validateUsernameNotExists = async (username) => {
  let usersWithUsername = [];

  try {
    usersWithUsername = await _fetchUsersByUsername(username);
  } catch (error) {
    throw new UserValidationError(
      `Could not validate that the user with the username '${username}' does not exist because an error occured while tryig to fetch the user with the username '${username}' from the database:`,
      { cause: error }
    );
  }

  if (usersWithUsername.length > 0) {
    throw new UserValidationError(
      `Validating user with the username '${username}' failed: A user with the username '${username}' already exists.`,
      "The username is already in use! Please choose another username."
    );
  }
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
  UserValidationError,
  InputValidationError,
  validateUserExists,
  validateUserNotExists,
  validateUsernameNotExists,
};
