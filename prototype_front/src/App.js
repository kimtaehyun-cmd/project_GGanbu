import React, { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

// MAIN
import HomePage from './components/main/HomePage';
import Signup from './components/main/Signup';
import User from './components/main/User';
import Search from './components/main/Search';
import FieldSearch from './components/main/FieldSearch';
import Rank from './components/main/Rank';
import Wordcloud from './components/main/Wordcloud';

// COMMON
import Sidebar from './components/common/Sidebar';
import Upperbar from './components/common/Upperbar';

import CharacterManager from './components/CharacterManager';
import ChatPage from './components/ChatPage';
import ImageCreate from './components/image_create/ImageCreate';
import TTSPage from './components/TTSPage';

import './App.css';
import Signin from './components/main/Signin';
import Mypage from './components/main/Mypage';
import GganbuPage from './components/GganbuPage';
import FollowPage from './components/FollowPage';

function App() {
  return (
    <BrowserRouter>
      <div className="app-main-frame">
        <div className="app-main-sidebar">
          <Sidebar />
        </div>
        <div className="app-main-content">
          {/* 특정 페이지에서는 Upperbar를 숨김 */}
          <Routes>
            <Route
              path="/CharacterManager"
              element={<CharacterManager setCurrentView={() => {}} />}
            />
            <Route path="/generate-image" element={<ImageCreate />} />

            <Route path="/signin" element={<Signin />} />
            <Route path="/ChatPage" element={<ChatPage />} />
            <Route path="/ChatPage/:chatRoomId" element={<ChatPage />} />
            <Route
              path="*"
              element={
                <>
                  <Upperbar />
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/TTSPage" element={<TTSPage />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/user" element={<User />} />
                    <Route path="/mypage" element={<Mypage />} />
                    <Route path="/signin" element={<Signin />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/fieldSearch" element={<FieldSearch />} />
                    <Route path="/rank" element={<Rank />} />
                    <Route path="/wordcloud" element={<Wordcloud />} />
                    <Route path="/Gganbu" element={<GganbuPage />} />
                    <Route path="/FollowPage" element={<FollowPage />} />
                  </Routes>
                </>
              }
            />
          </Routes>
        </div>
      </div>
      <ToastContainer position="top-center" autoClose={1500} theme="light" />
    </BrowserRouter>
  );
}

export default App;
