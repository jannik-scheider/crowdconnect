// export interface User {
//   id: string;
//   username: string;
//   roomName?: string;
// }

const { getChatRoom } = require("./rooms");

const users = [];

const addUser = ({ id, username }) => {
  // Clean the data
  username = username.trim().toLowerCase();

  // Validate the data
  if (!username) {
    return {
      error: {
        userMessage: "Username is required for login!",
        cause: "Cannot create user when the given username is empty.",
      },
    };
  }

  // Check for existing user
  const existingUser = getUserById(id);

  // Validate username
  if (existingUser) {
    return {
      error: {
        userMessage:
          "An unexpected error occurred during the login attempt. Please refresh the page and try again.",
        cause: `Cannot create user because a user with the ID ${id} does already exist.`,
      },
    };
  }

  // Check for existing username
  const existingUsername = !!getUserByUsername(username);

  if (existingUsername) {
    return {
      error: {
        userMessage:
          "Username is already in use! Please choose another username.",
        cause: `Cannot create user because a user with the username ${username} does already exist.`,
      },
    };
  }

  // Store user
  const user = { id, username };
  users.push(user);
  return { user };
};

const deleteUser = (userId) => {
  const index = users.findIndex((user) => user.id === userId);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
};

const assignRoomToUser = (userId, roomName) => {
  // Validate the data
  if (!userId || !roomName) {
    return {
      error: {
        userMessage:
          "An unexpected error occurred when trying to join the chat room. Please refresh the page and try again.",
        cause: `Cannot assign room '${roomName}' to the user with the ID ${userId} because either the given user id or username is empty.`,
      },
    };
  }

  // Clean the data
  roomName = roomName.trim().toLowerCase();

  const user = getUserById(userId);
  const existingRoom = getChatRoom(roomName);

  if (!user || !existingRoom) {
    return {
      error: {
        userMessage:
          "An unexpected error occurred when trying to join the chat room. Please refresh the page and try again.",
        cause: `Cannot assign room '${roomName}' to the user with the ID '${userId}' because either the user with the ID '${id}' or the room with the room name '${roomName}' does not exist.`,
      },
    };
  }

  user.roomName = roomName;

  return { user };
};

const removeRoomFromUser = (userId, roomName) => {
  // Validate the data
  if (!userId || !roomName) {
    return {
      error: {
        userMessage:
          "An unexpected error occurred. Please refresh the page and try again.",
        cause: `Cannot remove room '${roomName}' from the user with the ID '${id}' because either the given user ID or room name is empty.`,
      },
    };
  }

  // Clean the data
  roomName = roomName.trim().toLowerCase();

  const user = getUserById(userId);

  if (!user) {
    return {
      error: {
        userMessage:
          "An unexpected error occurred during signout. Please refresh the page and try again.",
        cause: `Cannot remove room '${roomName}' from the user with the ID '${id}' because the user with the ID '${id}' does not exist.`,
      },
    };
  }

  delete user.roomName;

  return { user };
};

const getUsers = () => users;

const getUserById = (userId) => {
  return users.find((user) => user.id === userId);
};

const getUserByUsername = (username) => {
  return users.find((user) => user.username === username);
};

const getUsersInRoom = (roomName) => {
  return users.filter((user) => user.roomName === roomName);
};

module.exports = {
  addUser,
  deleteUser,
  assignRoomToUser,
  removeRoomFromUser,
  getUsers,
  getUserById,
  getUserByUsername,
  getUsersInRoom,
};
