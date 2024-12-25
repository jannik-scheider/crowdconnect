// export interface User {
//   id: string;
//   username: string;
//   roomName: string;
// }

const users = [];

const addUser = ({ id, username, roomName }) => {
  // Clean the data
  username = username.trim().toLowerCase();
  roomName = roomName.trim().toLowerCase();

  // Validate the data
  if (!username || !roomName) {
    return {
      error: "Username and room name are required!",
    };
  }

  // Check for existing user
  const existingUser = users.find((user) => {
    return user.username === username && user.roomName === roomName;
  });

  // Validate username
  if (existingUser) {
    return {
      error: "Username is already in use!",
    };
  }

  // Store user
  const user = { id, username, roomName };
  users.push(user);
  return { user };
};

const removeUser = (userId) => {
  const index = users.findIndex((user) => user.id === userId);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
};

const getUsers = () => users;

const getUser = (userId) => {
  return users.find((user) => user.id === userId);
};

const getUsersInRoom = (roomName) => {
  return users.filter((user) => user.roomName === roomName);
};

module.exports = {
  addUser,
  removeUser,
  getUsers,
  getUser,
  getUsersInRoom,
};
