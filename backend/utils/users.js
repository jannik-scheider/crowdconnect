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
      error: "Username is required!",
    };
  }

  // Check for existing user
  const existingUser = getUser(id);

  // Validate username
  if (existingUser) {
    return {
      error: "Username is already in use!",
    };
  }

  // Store user
  const user = { id, username };
  users.push(user);
  return { user };
};

const removeUser = (userId) => {
  const index = users.findIndex((user) => user.id === userId);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
};

const assignRoomToUser = (userId, roomName) => {
  // Validate the data
  if (!userId || !roomName) {
    return {
      error: "User ID and room name are required!",
    };
  }

  // Clean the data
  roomName = roomName.trim().toLowerCase();

  const user = getUser(userId);
  const existingRoom = getChatRoom(roomName);

  if (!user || !existingRoom) {
    if (!user) {
      console.error(`Error: User with ID '${userId}' does not exist!`);
    }
    if (!existingRoom) {
      console.error(`Error: Room with name '${userId}' does not exist!`);
    }

    return {
      error: `An error occurred when trying to assign the chat room to the user!`,
    };
  }

  user.roomName = roomName;

  return { user };
};

const removeRoomFromUser = (userId, roomName) => {
  // Validate the data
  if (!userId || !roomName) {
    return {
      error: "User ID and room name are required!",
    };
  }

  // Clean the data
  roomName = roomName.trim().toLowerCase();

  const user = getUser(userId);
  const existingRoom = getChatRoom(roomName);

  if (!user || !existingRoom) {
    if (!user) {
      console.error(`Error: User with ID '${userId}' does not exist!`);
    }
    if (!existingRoom) {
      console.error(`Error: Room with name '${userId}' does not exist!`);
    }

    return {
      error: `An error occurred when trying to remove the chat room from the user!`,
    };
  }

  delete user.roomName;

  return { user };
};

const getUsers = () => users;

const getUser = (userId) => {
  console.log("users", users);
  return users.find((user) => user.id === userId);
};

const getUsersInRoom = (roomName) => {
  return users.filter((user) => user.roomName === roomName);
};

module.exports = {
  addUser,
  removeUser,
  assignRoomToUser,
  removeRoomFromUser,
  getUsers,
  getUser,
  getUsersInRoom,
};
