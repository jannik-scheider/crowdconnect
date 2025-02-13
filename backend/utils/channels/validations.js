const { fetchChannelByName } = require("./channels.js");

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

module.exports = {};
