// export interface ChatRoom {
//   name: string;
// }

const rooms = [];

const createChatRoom = (roomName) => {
  // Clean the data
  roomName = roomName.trim().toLowerCase();

  // Validate the data
  if (!roomName) {
    return {
      error: "Room name is required!",
    };
  }

  // Check for existing room
  const existingRoom = rooms.find((room) => {
    return room.name === roomName;
  });

  // Validate room name
  if (existingRoom) {
    return {
      error: "Room name is already in use!",
    };
  }

  // Store room
  const room = { name: roomName };
  rooms.push({ name: roomName });
  return { room };
};

const getChatRooms = () => rooms;

module.exports = {
  createChatRoom,
  getChatRooms,
};
