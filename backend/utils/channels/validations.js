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

const validateChannelExists = async (channelName) => {
  let existingChannel = null;

  try {
    existingChannel = await fetchChannelByName(channelName);
  } catch (error) {
    throw new UserValidationError(
      `Could not validate that the channel with the name '${channelName}' does not exist because an error occured while tryig to fetch the channel with the name '${channelName}' from the database:`,
      { cause: error }
    );
  }

  if (!existingChannel) {
    throw new UserValidationError(
      `A channel with the name '${channelName}' does not exist.`
    );
  }
};

module.exports = { validateChannelExists };
