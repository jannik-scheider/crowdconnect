import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./index.css";

import LoginPage from "./components/LoginPage";
import LandingPage from "./components/LandingPage";
import ChannelPage from "./components/ChannelPage";

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/channels" element={<LandingPage />} />
      <Route path="/channel" element={<ChannelPage />} />
    </Routes>
  </BrowserRouter>
);

export default App;
