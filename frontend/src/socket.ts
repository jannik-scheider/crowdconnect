/* Initialisierung des Sockets. */

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

// "undefined" means the URL will be computed from the `window.location` object
const URL =
  process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000";

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(URL, {
      autoConnect: true,
      withCredentials: true,
      transports: ["websocket"],
    });
  }
  return socket;
};
