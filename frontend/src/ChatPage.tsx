import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

const socket = io('http://522814722868.dkr.ecr.eu-central-1.amazonaws.com/live-chat-app', {
  withCredentials: true,
  transports: ['websocket'], // Erzwingt WebSocket
});

interface Message {
  user: string;
  message: string;
}

const ChatPage: React.FC = () => {
  const location = useLocation();
  const username = location.state?.username;
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Wenn kein Username vorhanden ist, zurück zur Startseite
    // und vollständiger Reload:
    if (!username) {
      window.location.href = '/';
      return;
    }

    // Nutzer tritt dem Chat bei
    socket.emit('joinChat', username);

    // Listener registrieren
    socket.on('chatMessage', (msg) => {
      setMessages((prev) => [...prev, { user: msg.username, message: msg.message }]);
    });

    socket.on('userJoined', (name) => {
      setMessages((prev) => [...prev, { user: 'System', message: `${name} hat den Chat betreten.` }]);
    });

    socket.on('userLeft', (name) => {
      setMessages((prev) => [...prev, { user: 'System', message: `${name} hat den Chat verlassen.` }]);
    });

    // Cleanup beim Unmount
    return () => {
      socket.off('chatMessage');
      socket.off('userJoined');
      socket.off('userLeft');
    };
  }, [username]);

  useEffect(() => {
    // Automatisches Scrollen nach unten
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit('chatMessage', message);
      setMessage(''); 
    }
  };

  const leaveChat = () => {
    // Socket trennen
    socket.disconnect();
    // Vollständiger Seitenreload zur Landepage
    window.location.href = '/';
  };

  // Farben
  const ownUserColor = '#ff9ff3';
  const otherUserColor = '#48dbfb';

  return (
    <div 
      className="
        flex flex-col h-screen 
        bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500
        p-4
      "
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="
          flex flex-col flex-1 
          bg-white/20 backdrop-blur-md rounded-xl shadow-lg 
          overflow-hidden
        "
      >
        {/* Header */}
        <motion.div
          className="flex items-center justify-between p-4 bg-white/10"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-xl font-semibold text-white drop-shadow">
            Live Chat
          </h2>
          <div className="flex items-center space-x-4">
            <span className="text-white/80 text-sm italic">
              Eingeloggt als: <span style={{ color: ownUserColor }}>{username}</span>
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
              const isOwn = msg.user === username;
              const isSystem = msg.user === 'System';
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className={`
                    break-words flex flex-col 
                    ${isSystem ? 'items-center' : 'items-start'}
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
                        {msg.user}:
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
        <div className="p-4 bg-white/10 flex items-center space-x-2">
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
                if (e.key === 'Enter') {
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

export default ChatPage;
