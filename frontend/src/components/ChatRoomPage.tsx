import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";
import { ChevronRightIcon } from "@heroicons/react/24/solid";

import { socket } from "../socket";

interface Message {
  username: string;
  message: string;
}

const ChatRoomPage: React.FC = () => {
  const location = useLocation();
  const username = location.state?.username;
  const roomName = location.state?.roomName;
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Benutzer tritt Chatroom bei
    socket.emit("joinChatRoom", { username, roomName }, (error: any) => {
      if (error) {
        alert(error);
        return navigate("/chat-rooms", { state: { username } });
      }
    });

    function onChatMessageEvent(message: Message) {
      setMessages((prev) => [
        ...prev,
        { username: message.username, message: message.message },
      ]);
    }

    function onUserJoinedEvent(username: string) {
      setMessages((prev) => [
        ...prev,
        { username: "System", message: `${username} hat den Chat betreten.` },
      ]);
    }

    function onUserLeftEvent(username: string) {
      setMessages((prev) => [
        ...prev,
        { username: "System", message: `${username} hat den Chat verlassen.` },
      ]);
    }

    // Listener registrieren
    socket.on("chatMessage", onChatMessageEvent);

    socket.on("userJoined", onUserJoinedEvent);

    socket.on("userLeft", onUserLeftEvent);

    // Cleanup beim Verlassen der Komponente
    return () => {
      socket.off("chatMessage", onChatMessageEvent);
      socket.off("userJoined", onUserJoinedEvent);
      socket.off("userLeft", onUserLeftEvent);

      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    // Automatisches Scrollen nach unten
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleRoomClick = (id: string) => {
    // TODO...
  };

  const sendMessage = () => {
    if (message.trim() && socket) {
      socket.emit("chatMessage", message);
      setMessage("");
    }
  };

  const leaveChat = () => {
    socket.disconnect();
    return navigate("/chat-rooms", { state: { username } });
  };

  // Farben
  const ownUserColor = "#ff9ff3";
  const otherUserColor = "#48dbfb";

  return (
    <div
      className="
        flex h-screen 
        bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500
        p-4
      "
    >
      {/* Rooms (sidebar) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.875 }}
        transition={{ duration: 0.1 }}
        className={`${
          isSidebarOpen ? "w-64" : "w-40"
        } rounded h-full p-4 mr-4 bg-gray-800 text-white transition-all duration-300`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Rooms</h2>
          <button
            className="bg-gray-700 hover:bg-gray-600 rounded p-1.5"
            title={isSidebarOpen ? "Sidebar einklappen" : "Sidebar ausklappen"}
            onClick={toggleSidebar}
          >
            {isSidebarOpen ? (
              <ChevronLeftIcon className="w-5 h-5" />
            ) : (
              <ChevronRightIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        <ul>
          <li className="mb-4 hover:bg-gray-700 p-2 rounded">
            <button
              className="w-full text-left"
              onClick={() => handleRoomClick("Room1")}
            >
              Room1
            </button>
          </li>
          <li className="mb-4 hover:bg-gray-700 p-2 rounded">
            <button
              className="w-full text-left"
              onClick={() => handleRoomClick("Room2")}
            >
              Room2
            </button>
          </li>
          <li className="mb-4 hover:bg-gray-700 p-2 rounded">
            <button
              className="w-full text-left"
              onClick={() => handleRoomClick("Room3")}
            >
              Room3
            </button>
          </li>
        </ul>
      </motion.div>

      {/* Chat area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="
          flex flex-col flex-1 p-4
          bg-white/20 backdrop-blur-md rounded-xl shadow-lg 
          overflow-hidden
        "
      >
        {/* Header */}
        <motion.div
          className="rounded flex items-center justify-between p-4 bg-white/10"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-xl font-semibold text-white drop-shadow">
            Live Chat
          </h2>
          <div className="flex items-center space-x-4">
            <span className="text-white/80 text-sm italic">
              Eingeloggt als:{" "}
              <span style={{ color: ownUserColor }}>{username}</span>
            </span>
            <Button
              onClick={leaveChat}
              className="
                bg-purple-400 hover:bg-purple-500 text-white
                px-4 py-1 rounded-full shadow-md 
                hover:scale-105 transition-transform duration-300 text-sm
                "
            >
              Verlassen
            </Button>
          </div>
        </motion.div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence>
            {messages.map((msg, idx) => {
              const isOwn = msg.username === username;
              const isSystem = msg.username === "System";
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className={`
                    break-words flex flex-col 
                    ${isSystem ? "items-center" : "items-start"}
                  `}
                >
                  {isSystem ? (
                    <span className="text-gray-200 italic text-sm bg-white/10 px-3 py-1 rounded-full">
                      {msg.message}
                    </span>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span
                        className="text-sm font-bold"
                        style={{ color: isOwn ? ownUserColor : otherUserColor }}
                      >
                        {msg.username}:
                      </span>
                      <span className="text-white/90">{msg.message}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={bottomRef}></div>
        </div>

        {/* Message Input */}
        <div className="flex items-center rounded p-4 space-x-2 bg-white/10">
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Input
              placeholder="Nachricht eingeben"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
              className="
                bg-white/70 text-gray-800 placeholder-gray-500 
                focus:bg-white focus:ring-2 focus:ring-purple-400 
                transition-all duration-300 rounded-full
              "
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Button
              onClick={sendMessage}
              className="
                bg-purple-600 hover:bg-purple-700 text-white 
                px-5 py-2 rounded-full shadow-md 
                hover:scale-105 transition-transform duration-300
              "
            >
              Senden
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default ChatRoomPage;
