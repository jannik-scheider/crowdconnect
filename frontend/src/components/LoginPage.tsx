import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { motion } from "framer-motion";
import { getSocket } from "../socket";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LoginPage: React.FC = () => {
  // const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const socket = getSocket();
  const navigate = useNavigate();

  // Initialize Socket connection
  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      console.log("Connected with ID:", socket.id);
    });

    // return () => {
    //   socket.disconnect();
    // };
  }, []);

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    const username = event.currentTarget.username.value;

    socket.emit("createUser", username, (errorMessage: string) => {
      if (errorMessage) {
        return setErrorMessage(errorMessage);
      }
      navigate("/chat-rooms", { state: { username } });
    });
  };

  return (
    <form
      className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4"
      onSubmit={handleLogin}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center space-y-6 
                   bg-white/20 backdrop-blur-md rounded-xl p-8 shadow-lg
                   max-w-sm w-full"
      >
        <motion.h1
          className="text-3xl font-bold text-white drop-shadow"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Willkommen zu CrowdConnect!
        </motion.h1>

        <motion.div
          className="w-full"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {errorMessage && (
            <div className="error-message bg-red-100 text-red-600 px-2 py-1.5 mb-3 w-full rounded leading-[1.35]">
              {errorMessage}
            </div>
          )}

          <Input
            placeholder="Benutzername"
            className="
              rounded bg-white/70 text-gray-800 placeholder-gray-500 
              focus:bg-white focus:ring-2 focus:ring-purple-400 
              transition-all duration-300 mb-2
            "
            name="username"
            required
          />

          {/* <Input
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="
              rounded bg-white/70 text-gray-800 placeholder-gray-500 
              focus:bg-white focus:ring-2 focus:ring-purple-400 
              transition-all duration-300
            "
            name="password"
            required
          /> */}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <Button
            type="submit"
            className="
              bg-purple-600 hover:bg-purple-700 text-white 
              px-5 py-2 rounded-full shadow-md 
              hover:scale-105 transition-transform duration-300
            "
          >
            Login
          </Button>
        </motion.div>
      </motion.div>
    </form>
  );
};

export default LoginPage;