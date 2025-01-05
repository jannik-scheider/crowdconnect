const { fetchChatRoomByName } = require("./chat-rooms.js");

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

const validateChatRoomExists = async (roomName) => {
  let existingRoom = null;

  try {
    existingRoom = await fetchChatRoomByName(roomName);
  } catch (error) {
    throw new UserValidationError(
      `Could not validate that the chat room with the name '${roomName}' does not exist because an error occured while tryig to fetch the chat room with the name '${roomName}' from the database:`,
      { cause: error }
    );
  }

  if (!existingRoom) {
    throw new UserValidationError(
      `A chat room with the name '${roomName}' does not exist.`
    );
  }
};

module.exports = { validateChatRoomExists };
