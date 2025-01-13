import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Sidebar.css';
import axios from 'axios';

import { ReactComponent as Login } from '../../assets/icons/login.svg';
import { ReactComponent as Logout } from '../../assets/icons/logout.svg';
import { ReactComponent as Create } from '../../assets/icons/create.svg';
import { ReactComponent as Explore } from '../../assets/icons/explore.svg';
import { ReactComponent as Chat } from '../../assets/icons/chat.svg';
import { ReactComponent as Friends } from '../../assets/icons/friends.svg';

import logo from '../../assets/logo.png';
import account from '../../assets/icons/account.png';

const Sidebar = () => {
  const navigate = useNavigate();

  const [nickname, setNickname] = useState('로그인 필요');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('/'); // 현재 활성화된 탭 경로 상태

  const checkLoginStatus = () => {
    const token = localStorage.getItem('authToken');
    const savedNickname = localStorage.getItem('userNickname');
    if (token && savedNickname) {
      setIsLoggedIn(true);
      setNickname(savedNickname);
    } else {
      setIsLoggedIn(false);
      setNickname('로그인 필요');
    }
  };

  useEffect(() => {
    // 컴포넌트 마운트 시 초기 상태 확인
    checkLoginStatus();

    // localStorage 변경 감지
    const handleStorageChange = () => {
      checkLoginStatus();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('loginStateChange', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('loginStateChange', handleStorageChange);
    };
  }, []);

  const handleLogout = async () => {
    try {
      // localStorage 비우기
      localStorage.removeItem('authToken');
      localStorage.removeItem('userNickname');

      // 상태 즉시 업데이트
      setIsLoggedIn(false);
      setNickname('로그인 필요');

      // 커스텀 이벤트 발생
      window.dispatchEvent(new Event('loginStateChange'));

      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleMouseEnter = () => {
    setIsDropdownVisible(true); // 마우스가 올려졌을 때 드롭다운 표시
  };

  const handleMouseLeave = () => {
    setIsDropdownVisible(false); // 마우스가 떠났을 때 드롭다운 닫기
  };
  const handleTabClick = (tabPath) => {
    setActiveTab(tabPath); // 현재 활성화된 탭 업데이트
    navigate(tabPath); // 해당 경로로 이동
  };

  return (
    <div className="side-container">
      <div className="side-wrapper">
        <div>
          <div className="side-logo" onClick={() => handleTabClick('/')}>
            <img src={logo} alt="logo" />
          </div>

          <div
            className={`button-create-char ${
              activeTab === '/CharacterManager' ? 'active' : ''
            }`}
          >
            <div
              className="retangle"
              onClick={() => handleTabClick('/CharacterManager')}
            >
              <Create className="logout" />
              <div>Create</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="side-tap">
            <div
              className={`side-find ${activeTab === '/' ? 'active' : ''}`}
              // 활성화된 상태에 따라 스타일 적용
              onClick={() => handleTabClick('/')}
            >
              <Explore className="sidetap-icon" />
              <div>Find</div>
            </div>

            {/* 채팅 화면 */}
            <div
              className={`side-chat ${
                activeTab === '/ChatPage' ? 'active' : ''
              }`}
              onClick={() => handleTabClick('/ChatPage')}
            >
              <Chat className="sidetap-icon " />
              <div>Chat</div>
            </div>

            {/* 친구 리스트 */}
            <div
              className={`side-Gganbu ${
                activeTab === '/Gganbu' ? 'active' : ''
              }`}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <Friends className="sidetap-icon" />
              <div>GGanbu</div>
              {isDropdownVisible && (
                <div className="gganbu-dropdown">
                  <div
                    className="dropdown-item"
                    onClick={() => handleTabClick('/Gganbu')}
                  >
                    만든 캐릭터
                  </div>
                  <div
                    className="dropdown-item"
                    onClick={() => handleTabClick('/FollowPage')}
                  >
                    팔로잉 캐릭터
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* 로그인 정보 */}
        <div>
          {isLoggedIn ? (
            <div>
              <div className="side-myInfo flex gap-2">
                <Link to="/mypage">
                  <img src={account} alt="account" className="account-icon" />
                </Link>
                <div className="nickname-text text-sm">{`${nickname} 님`}</div>
              </div>
              <div className="side-logout" onClick={handleLogout}>
                <Logout className="logout" />
                <div>Logout</div>
              </div>
            </div>
          ) : (
            <div className="side-login">
              <Link to="/signin" className="flex justify-between w-full">
                <Login className="login" />
                <div>Login</div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
