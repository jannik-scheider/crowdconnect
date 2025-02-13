import React, { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/solid";

import { getSocket } from "../socket";
import { ArrowLeftEndOnRectangleIcon } from "@heroicons/react/24/outline";

interface ChannelInfo {
  ownerName: string;
  userCount: number;
  name: string;
  ownerId: string;
  isLive: boolean;
}

interface Message {
  username: string;
  message: string;
  latency: number;
}

const ChannelPage: React.FC = () => {
  const location = useLocation();
  const [recommendedChannels, setRecommendedChannels] = useState<ChannelInfo[]>(
    []
  );
  const username = location.state?.username;
  const channelName = location.state?.channelName;
  const channelOwnerId = location.state?.channelOwnerId;
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const socket = getSocket();
  const navigate = useNavigate();

  const sortAndLimitChannels = useCallback(
    (channels: ChannelInfo[]) => {
      return (
        channels
          .sort((a, b) => b.userCount - a.userCount) // Nach Anzahl der Zuschauer sortieren (absteigend)
          .filter((channel) => channel.name !== channelName) // Diesen Channel ausblenden
          .filter(({ isLive }) => !!isLive) // Nur Live-Channels anzeigen
          // .filter((channel) => channel.userCount > 0) // Channels mit 0 Zuschauern ignorieren
          .slice(0, 10)
      ); // Auf die ersten 10 Elemente begrenzen
    },
    [channelName]
  );

  const leaveChannel = useCallback(() => {
    socket.emit("leaveChannel", channelName, (error: unknown) => {
      if (error) {
        alert(error);
        return navigate("/");
      }
    });
    // TODO: Wie bekomme ich alle Channels inkl. Anzahl der Nutzer in LandingPage.tsx für die Übersicht?
    navigate("/channels", { state: { username } });
  }, [channelName, navigate, socket, username]);

  useEffect(() => {
    if (!username || !channelName) {
      navigate("/");
    }

    socket.emit("getChannelsInfo", (channelsInfo: ChannelInfo[]) => {
      const sortedAndLimitedChannels = sortAndLimitChannels(channelsInfo);
      setRecommendedChannels(sortedAndLimitedChannels);
    });

    window.addEventListener("popstate", leaveChannel);

    return () => {
      window.removeEventListener("popstate", leaveChannel);
    };
  }, [
    channelName,
    leaveChannel,
    navigate,
    socket,
    sortAndLimitChannels,
    username,
  ]);

  useEffect(() => {
    function onChatMessageEvent(message: Message) {
      const now = Date.now();

      // Die Zeit, die zwischen "Abschicken bei X" und "Angekommen/Angezeigt bei Y" vergangen ist
      const latencyMs = now - message.latency;
      console.log("Latenz (ms):", latencyMs);

      setMessages((prev) => [
        ...prev,
        {
          username: message.username,
          message: message.message,
          // Optional: latency für Debug oder Anzeige verwenden
          latency: message.latency,
        },
      ]);
    }

    function onUserJoinedEvent(username: string) {
      setMessages((prev) => [
        ...prev,
        {
          username: "System",
          message: `${username} hat den Chat betreten.`,
          latency: Date.now(),
        },
      ]);
    }

    function onChannelOwnerLeftEvent(username: string) {
      setMessages((prev) => [
        ...prev,
        {
          username: "System",
          message:
            "Der Host hat den Channel verlassen. Der Channel wird in 5 Sekunden geschlossen.",
          latency: Date.now(),
        },
      ]);

      setTimeout(() => navigate("/channels", { state: { username } }), 5_000);
    }

    function onUserLeftEvent(username: string) {
      setMessages((prev) => [
        ...prev,
        {
          username: "System",
          message: `${username} hat den Chat verlassen.`,
          latency: Date.now(),
        },
      ]);
    }

    function onUpdatedChannelsEvent(updatedChannels: ChannelInfo[]) {
      const sortedAndLimitedChannels = sortAndLimitChannels(updatedChannels);
      setRecommendedChannels(sortedAndLimitedChannels);
    }

    function onChannelDeletedEvent() {
      setMessages((prev) => [
        ...prev,
        {
          username: "System",
          message:
            "Dieser Chatroom wurde gelöscht und wird in 5 Sekunden geschlossen.",
          latency: Date.now(),
        },
      ]);

      setTimeout(() => navigate("/channels", { state: { username } }), 5_000);
    }

    // Listeners registrieren
    socket.on("chatMessage", onChatMessageEvent);

    socket.on("userJoined", onUserJoinedEvent);

    socket.on("channelOwnerLeft", onChannelOwnerLeftEvent);

    socket.on("userLeft", onUserLeftEvent);

    socket.on("updatedChannels", onUpdatedChannelsEvent);

    socket.on("channelDeleted", onChannelDeletedEvent);

    // Cleanup beim Verlassen der Komponente
    return () => {
      socket.off("chatMessage", onChatMessageEvent);
      socket.off("userJoined", onUserJoinedEvent);
      socket.off("channelOwnerLeft", onChannelOwnerLeftEvent);
      socket.off("userLeft", onUserLeftEvent);
      socket.off("updatedChannels", onUpdatedChannelsEvent);
      socket.off("channelDeleted", onChannelDeletedEvent);

      // socket.disconnect();
    };
  }, [navigate, socket, channelName, username, sortAndLimitChannels]);

  useEffect(() => {
    // Automatisches Scrollen nach unten
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const sendMessage = () => {
    if (message.trim()) {
      const payload = {
        newMessage: message,
        latency: Date.now(), // Zeitstempel in Millisekunden
      };
      socket.emit("chatMessage", { payload, channelName });
      setMessage("");
    }
  };

  const handleJoinChannel = (newChannelName: string) => {
    socket.emit("leaveChannel", channelName, (error: unknown) => {
      if (error) {
        alert(error);
        return navigate("/");
      }
    });

    socket.emit("joinChannel", newChannelName, (errorMessage: unknown) => {
      if (errorMessage) {
        alert(errorMessage);
        return navigate("/");
      }
      // TODO: Wie bekomme ich alle Channels inkl. Anzahl der Nutzer in LandingPage.tsx für die Übersicht?
      navigate("/channel", {
        state: { username, channelName: newChannelName },
      });
    });

    setMessages([]);
  };

  const signOut = () => {
    socket.disconnect();
    navigate("/");
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
      {/* Channels Sidebar */}

      {channelOwnerId !== socket.id && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.875 }}
          transition={{ duration: 0.1 }}
          className={`${
            isSidebarOpen ? "w-72" : "w-48"
          } rounded h-full p-4 bg-gray-800 text-white transition-all duration-300`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Empfohlene Live-Kanäle</h2>
            <button
              className="bg-gray-700 hover:bg-gray-600 rounded p-1.5"
              title={
                isSidebarOpen ? "Sidebar einklappen" : "Sidebar ausklappen"
              }
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
            {recommendedChannels.map((channel) => (
              <li className="mb-2 hover:bg-gray-700 p-2 rounded w-full">
                <button
                  className="flex justify-between items-center w-full text-left"
                  title="Channel beitreten"
                  onClick={() => handleJoinChannel(channel.name)}
                >
                  <div className="truncate w-4/5 mr-4">
                    <span className="font-bold text-[1.075rem]">
                      {channel.name}
                    </span>
                    <br></br>
                    {channel.ownerName}
                  </div>

                  <div
                    className="flex items-center justify-end w-1/3 overflow-hidden"
                    title={`${channel.userCount} Zuschauer`}
                  >
                    <div className="min-w-3.5 min-h-3.5 bg-red-500 rounded-full border border-white mt-[2px]"></div>
                    <p className="ml-2 text-white truncate">
                      {channel.userCount}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      <motion.div className="flex flex-col gap-4 min-w-[60%] grow mx-4">
        {channelOwnerId === socket.id && (
          <p className="text-white text-4xl font-semibold">Stream Preview</p>
        )}

        <iframe
          className="rounded h-full"
          src={`https://player.twitch.tv/?channel=${"NoWay4u_Sir"}&parent=${"crowdconnect.fun"}`}
          width="100%"
          allowFullScreen
          frameBorder="0"
        ></iframe>
      </motion.div>

      {/* Chat area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="
          flex flex-col p-4 min-w-[20%] 
          bg-white/20 backdrop-blur-md rounded-xl shadow-lg 
          overflow-hidden
        "
      >
        {/* Header */}
        <motion.div
          className="rounded flex items-center justify-between p-4 text-wrap  bg-white/10"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2
            className="text-xl font-semibold text-white drop-shadow truncate cursor-default"
            title={channelName}
          >
            {channelName}
          </h2>

          <div className="h-7 w-px bg-gray-300 mx-4 rounded-full"></div>

          <div className="flex items-center space-x-3">
            <Button
              variant="link"
              title="Zurück zur Channel-Übersicht"
              onClick={leaveChannel}
            >
              <ArrowLeftIcon strokeWidth={2.5} />
              <span className="leading-none">Verlassen</span>
            </Button>

            <Button variant="link" onClick={signOut}>
              <ArrowLeftEndOnRectangleIcon strokeWidth={2.5} />
              <span className="leading-none">Abmelden</span>
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
            <Button variant="default" onClick={sendMessage}>
              Senden
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default ChannelPage;
