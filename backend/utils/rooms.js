// export interface ChatRoom {
//   name: string;
//   ownerId: String;
// }

const { getUserById } = require("./users");

const rooms = [];

const createChatRoom = (ownerId, roomName) => {
  // Validate the data
  if (!ownerId) {
    return {
      error: {
        userMessage:
          "An unexpected error occurred when trying to create the chat room. Please refresh the page and try again.",
        cause: "Cannot create chat room because the given owner ID is empty.",
      },
    };
  }

  // TODO: Bei Implementierung von Datenbank auskommentieren
  // const user = getUserById(ownerId);

  // if (!user) {
  //   return {
  //     error: {
  //       userMessage:
  //         "An unexpected error occurred when trying to create the chat room. Please refresh the page and try again.",
  //       cause: `Cannot create chat room '${roomName}' because the owner with the ID '${id}' does not exist.`,
  //     },
  //   };
  // }

  // Clean the data
  roomName = roomName.trim().toLowerCase();

  // Validate the data
  if (!roomName) {
    return {
      error: {
        userMessage: "Room name is required!",
        cause: "Cannot create chat room because the given room name is empty.",
      },
    };
  }

  // Check for existing room
  const existingRoom = rooms.find((room) => {
    return room.name === roomName;
  });

  // Validate room name
  if (existingRoom) {
    return {
      error: {
        userMessage: `A chatroom with the name ${roomName} does already exist! Please provide another name.`,
        cause: `Cannot crate chat room '${roomName}' because a chat room with the name '${roomName}' does already exist.`,
      },
    };
  }

  // Store room
  const room = { ownerId, name: roomName };
  rooms.push(room);
  return { room };
};

const deleteChatRoom = (roomName) => {
  const index = rooms.findIndex((room) => room.name === roomName);

  if (index !== -1) {
    return rooms.splice(index, 1)[0];
  }
};

const getChatRoom = (roomName) => {
  return rooms.find((room) => room.name === roomName);
};

const getChatRooms = () => rooms;

module.exports = {
  createChatRoom,
  deleteChatRoom,
  getChatRoom,
  getChatRooms,
};
