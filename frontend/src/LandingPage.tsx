import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

const LandingPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handleJoin = () => {
    if (username.trim()) {
      navigate('/chat', { state: { username } });
    }
  };

  return (
    <div 
      className="flex h-screen items-center justify-center 
                 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 
                 p-4"
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
          Willkommen im Chat!
        </motion.h1>
        <motion.div
          className="w-full"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Input
            placeholder="Benutzernamen eingeben"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleJoin();
              }
            }}
            className="
              bg-white/70 text-gray-800 placeholder-gray-500 
              focus:bg-white focus:ring-2 focus:ring-purple-400 
              transition-all duration-300
            "
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <Button
            onClick={handleJoin}
            className="
              bg-purple-600 hover:bg-purple-700 text-white 
              px-5 py-2 rounded-full shadow-md 
              hover:scale-105 transition-transform duration-300
            "
          >
            Beitreten
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LandingPage;
