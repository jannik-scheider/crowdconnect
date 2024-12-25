import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";

import { PlusIcon } from "@heroicons/react/24/solid";

import { socket } from "../socket";
import { Button } from "./ui/button";

interface ChatRoomInfo {
  userCount: number;
  name: string;
}

const LandingPage: React.FC = () => {
  // const rooms = getRooms();
  const location = useLocation();
  const username = location.state?.username;
  const [isCreateRoomDialogOpen, setIsCreateRoomDialogOpen] = useState(false);
  const [chatRoomName, setChatRoomName] = useState("");
  const [chatRooms, setChatRooms] = useState<ChatRoomInfo[]>([]);
  const navigate = useNavigate();

  // Initialize Socket connection
  useEffect(() => {
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    function onChatRoomsInfoEvent(roomInfos: ChatRoomInfo[]) {
      setChatRooms(roomInfos);
    }

    socket.emit("getChatRoomsInfo", (roomsInfo: ChatRoomInfo[]) => {
      setChatRooms(roomsInfo);
    });

    // Cleanup beim Verlassen der Komponente
    return () => {
      socket.off("chatRooms", onChatRoomsInfoEvent);
    };
  }, []);

  const handleCreateRoom = () => {
    if (chatRoomName.trim() && socket) {
      socket.emit("createChatRoom", chatRoomName, (error: any) => {
        if (error) {
          return alert(error);
        }
      });
      setIsCreateRoomDialogOpen(false);
      setChatRoomName("");
    }
  };

  const handleJoinRoom = (roomName: string) => {
    // TODO: Wie bekomme ich alle Rooms inkl. Anzahl der Nutzer in LandingPage.tsx für die Übersicht?
    navigate("/chat-room", { state: { username, roomName } });
  };

  const signOut = () => {};

  // Farben
  const ownUserColor = "#ff9ff3";

  return (
    <div className="h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8">
      {/* Header */}
      <motion.div
        className="rounded flex items-center justify-between p-4 mb-8 bg-white/10"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-xl font-semibold text-white drop-shadow">
          CrowdConnect
        </h2>
        <div className="flex items-center space-x-4">
          <span className="text-white/80 text-sm italic">
            Eingeloggt als:{" "}
            <span style={{ color: ownUserColor }}>{username}</span>
          </span>
          <Button
            onClick={signOut}
            className="
                      bg-purple-400 hover:bg-purple-500 text-white
                      px-4 py-1 rounded-full shadow-md 
                      hover:scale-105 transition-transform duration-300 text-sm
                      "
          >
            Sign out
          </Button>
        </div>
      </motion.div>

      <div className="flex justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-4 text-gray-100">Chat rooms</h1>
          <p className="text-gray-100 text-lg mb-5">
            Here is an overview of all chat rooms...
          </p>
        </div>

        <Button
          className="
                    bg-purple-400 hover:bg-purple-500 text-white
                    rounded-full shadow-md h-12 my-4
                    hover:scale-105 transition-transform duration-300 text-sm
                "
          onClick={() => setIsCreateRoomDialogOpen(true)}
          title="Create chat room"
        >
          <PlusIcon />
          Create room
        </Button>

        {/* Dialog */}
        {isCreateRoomDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded shadow-lg w-80">
              <h2 className="text-lg font-bold mb-4">Raumname</h2>
              <input
                type="text"
                value={chatRoomName}
                onChange={(e) => setChatRoomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateRoom();
                  }
                }}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-blue-300 mb-4"
                placeholder="Gib deine Raumnummer ein"
              />
              <div className="flex justify-end space-x-2">
                {/* Abbrechen Button */}
                <button
                  onClick={() => setIsCreateRoomDialogOpen(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Abbrechen
                </button>
                {/* Bestätigen Button */}
                <button
                  onClick={handleCreateRoom}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Bestätigen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Container */}
      <div className="flex p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-wrap gap-4"
        >
          {chatRooms.map((room, index) => (
            <motion.div
              key={index}
              className="
                flex flex-col justify-between
                rounded w-52 h-48 p-4
                bg-white/20 backdrop-blur-md rounded-xl shadow-lg  
                "
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-xl font-semibold text-white drop-shadow">
                {room.name}
              </h2>
              <p className="text-gray-100 text-lg mb-5">
                Users: {room.userCount}
              </p>

              <Button
                className="
                    bg-purple-400 hover:bg-purple-500 text-white
                    px-4 py-1 rounded-full shadow-md 
                    hover:scale-105 transition-transform duration-300 text-sm
                "
                onClick={() => handleJoinRoom(room.name)}
              >
                Join
              </Button>
            </motion.div>
          ))}
          {/* Chat room as card */}
        </motion.div>
      </div>
    </div>
  );
};

export default LandingPage;
