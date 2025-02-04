import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";

import {
  ArrowRightIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowLeftEndOnRectangleIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import { getSocket } from "../socket";
import { Button } from "./ui/button";

interface ChannelInfo {
  ownerName: string | null;
  userCount: number | null;
  name: string;
  ownerId: string;
  isLive: boolean;
}

const LandingPage: React.FC = () => {
  // const channels = getChannels();
  const location = useLocation();
  const username = location.state?.username;
  const [isCreateChannelDialogOpen, setIsCreateChannelDialogOpen] =
    useState(false);
  const [channelName, setChannelName] = useState("");
  const [ownChannels, setOwnChannels] = useState<ChannelInfo[]>([]);
  const [liveChannels, setLiveChannels] = useState<ChannelInfo[]>([]);
  const [createChannelErrorMessage, setCreateChannelErrorMessage] =
    useState("");
  const socket = getSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (!username) {
      navigate("/");
    }

    socket.emit("getChannelsInfo", (channelsInfo: ChannelInfo[]) => {
      const liveChannels = channelsInfo
        .filter((channel) => channel.ownerId !== socket.id)
        .filter(({ isLive }) => !!isLive);
      setLiveChannels(liveChannels);

      const ownChannels = channelsInfo.filter(
        (channel) => channel.ownerId === socket.id
      );
      setOwnChannels(ownChannels);
    });

    function onUpdatedChannelsEvent(updatedChannels: ChannelInfo[]) {
      const liveChannels = updatedChannels
        .filter((channel) => channel.ownerId !== socket.id)
        .filter(({ isLive }) => !!isLive);
      setLiveChannels(liveChannels);

      const ownChannels = updatedChannels.filter(
        (channel) => channel.ownerId === socket.id
      );
      setOwnChannels(ownChannels);
    }

    socket.on("updatedChannels", onUpdatedChannelsEvent);

    // Cleanup beim Verlassen der Komponente
    return () => {
      socket.off("updatedChannels", onUpdatedChannelsEvent);

      //   socket.disconnect();
    };
  }, []);

  const handleCreateChannel = () => {
    if (channelName.trim()) {
      socket.emit("createChannel", channelName, (errorMessage: string) => {
        if (errorMessage) {
          return setCreateChannelErrorMessage(errorMessage);
        }
        resetCreateChannelDialog();
      });
    }
  };

  const resetCreateChannelDialog = () => {
    setIsCreateChannelDialogOpen(false);
    setCreateChannelErrorMessage("");
    setChannelName("");
  };

  const handleJoinChannel = (channelName: string, channelOwnerId: string) => {
    socket.emit("joinChannel", channelName, (errorMessage: unknown) => {
      if (errorMessage) {
        alert(errorMessage);
        return navigate("/");
      }
      // TODO: Wie bekomme ich alle Channels inkl. Anzahl der Nutzer in LandingPage.tsx für die Übersicht?
      navigate("/channel", {
        state: { username, channelName, channelOwnerId },
      });
    });
  };

  const handleDeleteChannel = (channelName: string) => {
    socket.emit("deleteChannel", channelName, (errorMessage: unknown) => {
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
        <div className="flex flex-col space-y-12">
          {ownChannels.length > 0 && (
            <div>
              <div className="flex justify-between">
                <div className="h-[64px]">
                  <h1 className="text-3xl font-bold text-gray-100">
                    Eigene Kanäle ({ownChannels.length})
                  </h1>
                </div>
              </div>

              {/* Container für eigene Kanäle */}
              <div className="flex">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="flex flex-wrap gap-4"
                >
                  {ownChannels.map((channel, index) => (
                    <motion.div
                      key={index}
                      className="
                flex flex-col justify-between
                rounded w-72 h-44 p-4 pr-5 pb-5
                bg-white/20 backdrop-blur-md rounded-xl shadow-lg
                cursor-default  
                "
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-3/4">
                          <span
                            className="block text-xl font-semibold text-white drop-shadow truncate leading-8"
                            title={channel.name}
                          >
                            {channel.name}
                          </span>

                          <span
                            className="block text-lg font-medium text-white drop-shadow truncate"
                            title="Owner"
                          >
                            {channel.ownerName}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-x-2">
                        <Button
                          className="
                    bg-purple-400 hover:bg-purple-500 text-white
                    px-4 py-1 rounded-full shadow-md 
                    hover:scale-105 transition-transform duration-300 text-sm
                "
                          title="Starte Livestream"
                          onClick={() =>
                            handleJoinChannel(channel.name, channel.ownerId)
                          }
                        >
                          <ArrowRightStartOnRectangleIcon strokeWidth={2.5} />
                          <span className="leading-none">Starten</span>
                        </Button>

                        {channel.ownerId === socket.id && (
                          <Button
                            className="
                          bg-purple-400 hover:bg-purple-500 text-white
                          px-4 py-1 rounded-full shadow-md 
                          hover:scale-105 transition-transform duration-300 text-sm
                        "
                            onClick={() => handleDeleteChannel(channel.name)}
                          >
                            <TrashIcon strokeWidth={2.5} />
                            <span className="leading-none">Löschen</span>
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {/* Channel as card */}
                </motion.div>
              </div>
            </div>
          )}

          <div>
            <div className="h-[64px]">
              <h1 className="text-3xl font-bold text-gray-100 mb-4">
                Live-Kanäle ({liveChannels.length})
              </h1>
            </div>

            {/* Container für Live-Kanäle */}
            <div className="flex">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex flex-wrap gap-4"
              >
                {liveChannels.map((channel, index) => (
                  <motion.div
                    key={index}
                    className="
                      flex flex-col justify-between
                      rounded w-72 h-44 p-4 pr-5 pb-5
                      bg-white/20 backdrop-blur-md rounded-xl shadow-lg
                      cursor-default  
                  "
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="flex items-start justify-between space-x-4">
                      <div className="w-2/3">
                        <span
                          className="block text-xl font-semibold text-white drop-shadow truncate leading-8"
                          title={channel.name}
                        >
                          {channel.name}
                        </span>

                        <span
                          className="block text-lg font-medium text-white drop-shadow truncate"
                          title="Owner"
                        >
                          {channel.ownerName}
                        </span>
                      </div>

                      {channel.userCount !== null && (
                        <div
                          className="flex items-center overflow-hidden"
                          title={`${channel.userCount} Zuschauer`}
                        >
                          <div className="min-w-3.5 min-h-3.5 bg-red-500 rounded-full border border-white mt-[2px]"></div>
                          <p className="ml-2 text-white truncate">
                            {channel.userCount}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-x-2">
                      <Button
                        className="
                    bg-purple-400 hover:bg-purple-500 text-white
                    px-4 py-1 rounded-full shadow-md 
                    hover:scale-105 transition-transform duration-300 text-sm
                "
                        title="Trete Livestream bei"
                        onClick={() =>
                          handleJoinChannel(channel.name, channel.ownerId)
                        }
                      >
                        <ArrowRightIcon strokeWidth={2.5} />
                        <span className="leading-none">Beitreten</span>
                      </Button>

                      {channel.ownerId === socket.id && (
                        <Button
                          className="
                  bg-purple-400 hover:bg-purple-500 text-white
                  px-4 py-1 rounded-full shadow-md 
                  hover:scale-105 transition-transform duration-300 text-sm
              "
                          onClick={() => handleDeleteChannel(channel.name)}
                        >
                          <TrashIcon strokeWidth={2.5} />
                          <span className="leading-none">Löschen</span>
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
                {/* Channel as card */}
              </motion.div>
            </div>
          </div>
        </div>

        <Button
          className="
                bg-purple-400 hover:bg-purple-500 text-white rounded-full shadow-md h-12 mb-4
                hover:scale-105 transition-transform duration-300 text-sm
              "
          onClick={() => setIsCreateChannelDialogOpen(true)}
        >
          <PlusIcon strokeWidth={2.5} />
          <span className="text-base">Kanal erstellen</span>
        </Button>

        {/* Dialog */}
        {isCreateChannelDialogOpen && (
          <div className="dialog-wrapper flex justify-center fixed inset-0 bg-black bg-opacity-50 z-50">
            <div className="dialog bg-white p-6 rounded shadow-lg h-fit w-80 mt-[16%]">
              <p className="text-xl font-bold mb-5">Neuer Kanal</p>

              {createChannelErrorMessage && (
                <div className="error-message bg-red-100 text-red-600 px-2 py-1.5 mb-3 w-full rounded leading-[1.35]">
                  {createChannelErrorMessage}
                </div>
              )}

              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateChannel();
                  }
                }}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-blue-300 mb-5"
                placeholder="Wie soll dein Kanal heißen?"
                required
              />
              <div className="flex justify-end space-x-2 mt-2">
                {/* Abbrechen Button */}
                <button
                  onClick={resetCreateChannelDialog}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Abbrechen
                </button>

                {/* Bestätigen Button */}
                <button
                  onClick={handleCreateChannel}
                  disabled={!!createChannelErrorMessage}
                  className="
                  px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600
                  disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-70
                "
                >
                  Bestätigen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPage;
