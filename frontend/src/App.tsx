import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./index.css";

import LoginPage from "./components/LoginPage";
import LandingPage from "./components/LandingPage";
import ChatRoomPage from "./components/ChatRoomPage";

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/chat-rooms" element={<LandingPage />} />
      <Route path="/chat-room" element={<ChatRoomPage />} />
    </Routes>
  </BrowserRouter>
);

export default App;
