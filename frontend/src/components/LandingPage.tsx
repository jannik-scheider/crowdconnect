import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";

import {
  ArrowRightIcon,
  ArrowLeftEndOnRectangleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

import { getSocket } from "../socket";
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
  const socket = getSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (!username) {
      navigate("/");
    }

    socket.emit("getChatRoomsInfo", (roomsInfo: ChatRoomInfo[]) => {
      console.log(roomsInfo);
      setChatRooms(roomsInfo);
    });

    function onUpdatedChatRoomsEvent(roomInfos: ChatRoomInfo[]) {
      setChatRooms(roomInfos);
    }

    socket.on("updatedChatRooms", onUpdatedChatRoomsEvent);

    // Cleanup beim Verlassen der Komponente
    return () => {
      socket.off("updatedChatRooms", onUpdatedChatRoomsEvent);

      //   socket.disconnect();
    };
  }, []);

  const handleCreateRoom = () => {
    if (chatRoomName.trim()) {
      socket.emit("createChatRoom", chatRoomName, (error: unknown) => {
        if (error) {
          alert(error);
          return navigate("/");
        }
      });
      setIsCreateRoomDialogOpen(false);
      setChatRoomName("");
    }
  };

  const handleJoinChatRoom = (roomName: string) => {
    socket.emit("joinChatRoom", roomName, (error: unknown) => {
      if (error) {
        alert(error);
        return navigate("/");
      }
      // TODO: Wie bekomme ich alle Rooms inkl. Anzahl der Nutzer in LandingPage.tsx für die Übersicht?
      navigate("/chat-room", { state: { username, roomName } });
    });
  };

  const signOut = () => {
    socket.disconnect();
    navigate("/");
  };

  // Farben
  const ownUserColor = "#ff9ff3";

  return (
    <div className="h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-14 py-10">
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
            className="
                      bg-purple-400 hover:bg-purple-500 text-white
                      px-4 py-1 rounded-full shadow-md 
                      hover:scale-105 transition-transform duration-300 text-sm
                      "
            onClick={signOut}
          >
            <ArrowLeftEndOnRectangleIcon strokeWidth={2.5} />
            <span className="leading-none">Ausloggen</span>
          </Button>
        </div>
      </motion.div>

      <div className="flex justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">
            Chat rooms ({chatRooms.length})
          </h1>
        </div>

        <Button
          className="
            bg-purple-400 hover:bg-purple-500 text-white rounded-full shadow-md h-12 my-2
            hover:scale-105 transition-transform duration-300 text-sm
          "
          onClick={() => setIsCreateRoomDialogOpen(true)}
        >
          <PlusIcon strokeWidth={2.5} />
          <span className="leading-none">Chatroom erstellen</span>
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
                placeholder="Gib deinen Raumnamen ein"
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
      <div className="flex">
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
                Benutzer: {room.userCount}
              </p>

              <Button
                className="
                    bg-purple-400 hover:bg-purple-500 text-white
                    px-4 py-1 rounded-full shadow-md 
                    hover:scale-105 transition-transform duration-300 text-sm
                "
                onClick={() => handleJoinChatRoom(room.name)}
              >
                <ArrowRightIcon strokeWidth={2.5} />
                <span className="leading-none">Beitreten</span>
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
