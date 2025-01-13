import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Signin = () => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (userId, password) => {
    try {
      setIsLoading(true);
      setMessage('');

      // 로그인 요청
      const response = await axios.post(`${process.env.REACT_APP_SERVER_DOMAIN}/signin`, {
        user_id: userId,
        password,
      });

      const { token } = response.data;
      localStorage.setItem('authToken', token);
      setMessage('로그인 성공!');
      setIsLoggedIn(true); // 로그인 상태 업데이트

      // 토큰 검증 요청
      const tokenResponse = await axios.get(`${process.env.REACT_APP_SERVER_DOMAIN}/verify-token`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const { user_idx } = tokenResponse.data;

      if (!user_idx) {
        throw new Error('유효한 사용자 ID를 찾을 수 없습니다.');
      }
      // user_idx와 nickname을 localStorage에 저장
      localStorage.setItem('user_idx', user_idx); // user_idx 저장

      const userInfoResponse = await axios.get(
        `${process.env.REACT_APP_SERVER_DOMAIN}/users/${user_idx}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { nickname } = userInfoResponse.data;
      console.log('사용자 정보:', nickname);
      navigate('/mypage');
      // 로그인 성공 시 onLoginSuccess 호출 및 /mypage로 이동
      localStorage.setItem('userNickname', nickname);

      window.dispatchEvent(new Event('storage')); // localStorage 변경 이벤트 발생
      navigate('/');
    } catch (error) {
      console.error('로그인 실패:', error);
      const errorMessage =
        error.response?.data?.detail ||
        '서버 오류로 인해 로그인에 실패했습니다.';
      setMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center bg-primary h-screen">
      <div className="w-full max-w-md bg-gray-700 rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold text-center text-white">로그인</h2>
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
            placeholder="아이디"
            aria-label="아이디"
            className="w-full p-3 rounded-lg bg-gray-600 focus:outline-none focus:ring focus:gradient text-white"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="비밀번호"
            aria-label="비밀번호"
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
            {isLoading ? '로딩 중...' : '로그인'}
          </button>
        </form>
        {message && <p className="mt-4 text-center text-white">{message}</p>}
        <div className="mt-6 text-center text-white ">
          아직 회원이 아닌신가요?{' '}
          <Link to="/signup" className="text-blue-400 hover:underline">
            회원가입
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signin;
