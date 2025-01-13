import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const User = ({ onLoginSuccess }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem('authToken') // 초기 상태를 localStorage와 동기화
  );
  const [userInfo, setUserInfo] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const fetchUser = async () => {
    const token = localStorage.getItem('authToken');

    if (!token) {
      setMessage('로그인이 필요합니다.');
      setIsLoggedIn(false);
      return;
    }
    try {
      setIsLoading(true);
      const { data: tokenData } = await axios.get(`${process.env.REACT_APP_SERVER_DOMAIN}/verify-token`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const { data: userInfo } = await axios.get(
        `${process.env.REACT_APP_SERVER_DOMAIN}/users/${tokenData.user_idx}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUserInfo(userInfo);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('토큰 검증 또는 사용자 정보 가져오기 실패:', error);
      setMessage('유효하지 않은 토큰입니다. 다시 로그인해주세요.');
      localStorage.removeItem('authToken'); // 유효하지 않은 토큰 제거
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    const token = localStorage.getItem('authToken');

    if (!token) {
      setMessage('로그인이 필요합니다.');
      setIsLoggedIn(false);
      return;
    }

    fetchUser();
  }, []); // 초기 마운트 시 한 번만 실행

  const handleLogin = async (userId, password) => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${process.env.REACT_APP_SERVER_DOMAIN}/signin`, {
        user_id: userId,
        password,
      });

      const { token } = response.data;
      localStorage.setItem('authToken', token);
      setMessage('로그인 성공!');
      setIsLoggedIn(true);

      const { data: tokenData } = await axios.get(`${process.env.REACT_APP_SERVER_DOMAIN}/verify-token`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log(tokenData);

      const { data: userInfo } = await axios.get(
        `${process.env.REACT_APP_SERVER_DOMAIN}/users/${tokenData.user_idx}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUserInfo(userInfo);
      onLoginSuccess(userInfo.nickname);
    } catch (error) {
      console.error('로그인 실패:', error);
      setMessage(
        error.response?.data?.detail || '네트워크 문제로 로그인에 실패했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  };
  console.log(userInfo);
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setUserInfo(null);
    setIsLoggedIn(false);
    setMessage('');
    navigate('/');
  };

  if (!isLoggedIn) {
    return (
      <div className="flex justify-center items-center bg-primary h-screen">
        <div className="w-full max-w-md bg-gray-700 rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-center text-white">Log In</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const userId = e.target.userId.value;
              const password = e.target.password.value;
              handleLogin(userId, password);
            }}
            className="space-y-6 mt-6"
          >
            <input
              type="text"
              name="userId"
              placeholder="Your Id"
              aria-label="Your Id"
              className="w-full p-3 rounded-lg bg-gray-600 focus:outline-none focus:ring focus:gradient text-white"
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              aria-label="Password"
              className="w-full p-3 rounded-lg bg-gray-600 focus:outline-none focus:ring focus:gradient text-white"
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-button hover:bg-hover text-white py-3 rounded-lg font-bold ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Loading...' : 'Log In'}
            </button>
          </form>
          {message && <p className="mt-4 text-center text-white">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center">
      <div className="w-full max-w-lg bg-sub rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-white mb-4 text-center">
          마이페이지
        </h1>
        <div className="space-y-4">
          <div className="flex items-center">
            {userInfo?.profile_picture ? (
              <img
                src={userInfo.profile_picture}
                alt="프로필 사진"
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-500 flex items-center justify-center text-white">
                사진 없음
              </div>
            )}
            <p className="text-white text-lg w-full flex justify-center">
              <span className="font-semibold">이름:</span> {userInfo?.nickname}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full bg-button hover:bg-hover text-white py-3 rounded-lg mt-6 font-bold"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
};

export default User;
