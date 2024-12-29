import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";

import {
  ArrowRightIcon,
  ArrowLeftEndOnRectangleIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import { getSocket } from "../socket";
import { Button } from "./ui/button";

interface ChatRoomInfo {
  userCount: number;
  ownerId: string;
  name: string;
}

const LandingPage: React.FC = () => {
  // const rooms = getRooms();
  const location = useLocation();
  const username = location.state?.username;
  const [isCreateChatRoomDialogOpen, setIsCreateChatRoomDialogOpen] =
    useState(false);
  const [chatRoomName, setChatRoomName] = useState("");
  const [chatRooms, setChatRooms] = useState<ChatRoomInfo[]>([]);
  const [createChatRoomErrorMessage, setCreateChatRoomErrorMessage] =
    useState("");
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

  const handleCreateChatRoom = () => {
    if (chatRoomName.trim()) {
      socket.emit("createChatRoom", chatRoomName, (errorMessage: string) => {
        if (errorMessage) {
          return setCreateChatRoomErrorMessage(errorMessage);
        }
        setIsCreateChatRoomDialogOpen(false);
        setCreateChatRoomErrorMessage("");
        setChatRoomName("");
      });
    }
  };

  const handleJoinChatRoom = (roomName: string) => {
    socket.emit("joinChatRoom", roomName, (errorMessage: unknown) => {
      if (errorMessage) {
        alert(errorMessage);
        return navigate("/");
      }
      // TODO: Wie bekomme ich alle Rooms inkl. Anzahl der Nutzer in LandingPage.tsx für die Übersicht?
      navigate("/chat-room", { state: { username, roomName } });
    });
  };

  const handleDeleteChatRoom = (roomName: string) => {
    socket.emit("deleteChatRoom", roomName, (errorMessage: unknown) => {
      if (errorMessage) {
        alert(errorMessage);
      }
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
            Chatrooms ({chatRooms.length})
          </h1>
        </div>

        <Button
          className="
            bg-purple-400 hover:bg-purple-500 text-white rounded-full shadow-md h-12 mb-4
            hover:scale-105 transition-transform duration-300 text-sm
          "
          onClick={() => setIsCreateChatRoomDialogOpen(true)}
        >
          <PlusIcon strokeWidth={2.5} />
          <span className="leading-none">Chatroom erstellen</span>
        </Button>
      </div>

      {/* Dialog */}
      {isCreateChatRoomDialogOpen && (
        <div className="flex items-center justify-center fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-lg font-bold mb-4">Chatroom Name</h2>

            {createChatRoomErrorMessage && (
              <div className="error-message bg-red-100 text-red-600 px-2 py-1.5 mb-3 w-full rounded leading-[1.35]">
                {createChatRoomErrorMessage}
              </div>
            )}

            <input
              type="text"
              value={chatRoomName}
              onChange={(e) => setChatRoomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateChatRoom();
                }
              }}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-blue-300 mb-4"
              placeholder="Gib den Namen deines Chatrooms ein"
              required
            />
            <div className="flex justify-end space-x-2">
              {/* Abbrechen Button */}
              <button
                onClick={() => setIsCreateChatRoomDialogOpen(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Abbrechen
              </button>
              {/* Bestätigen Button */}
              <button
                onClick={handleCreateChatRoom}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Bestätigen
              </button>
            </div>
          </div>
        </div>
      )}

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
                rounded w-72 h-48 p-4
                bg-white/20 backdrop-blur-md rounded-xl shadow-lg  
                "
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-xl font-semibold text-white drop-shadow truncate">
                {room.name}
              </h2>
              <p className="text-gray-100 text-lg mb-5">
                Benutzer: {room.userCount}
              </p>

              <div className="flex gap-x-2">
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

                {room.ownerId === socket.id && (
                  <Button
                    className="
                  bg-purple-400 hover:bg-purple-500 text-white
                  px-4 py-1 rounded-full shadow-md 
                  hover:scale-105 transition-transform duration-300 text-sm
              "
                    onClick={() => handleDeleteChatRoom(room.name)}
                  >
                    <TrashIcon strokeWidth={2.5} />
                    <span className="leading-none">Löschen</span>
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
          {/* Chat room as card */}
        </motion.div>
      </div>
    </div>
  );
};

export default LandingPage;
