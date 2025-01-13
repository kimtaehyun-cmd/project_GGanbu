import React, { useState } from 'react';
import axios from 'axios';

const Signup = () => {
  const [nickname, setNickname] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [profileimg, setProfileimg] = useState(null);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 회원가입 요청
      const signupResponse = await axios.post(
        `${process.env.REACT_APP_SERVER_DOMAIN}/signup`,
        {
          nickname,
          user_id: userId,
          password,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // 프로필 사진 업로드 요청
      if (profileimg) {
        const formData = new FormData();
        formData.append('file', profileimg);
        await axios.post(
          `${process.env.REACT_APP_SERVER_DOMAIN}/upload-profile-img/${userId}/`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      }

      setMessage(signupResponse.data.message); // 성공 메시지
    } catch (error) {
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;

        if (Array.isArray(detail)) {
          setMessage(detail.map((d) => d.msg).join(', '));
        } else if (typeof detail === 'object') {
          setMessage(detail.msg || JSON.stringify(detail));
        } else {
          setMessage(detail);
        }
      } else {
        setMessage('회원가입에 실패했습니다.');
      }
    }
  };

  return (
    <div className="flex justify-center items-center bg-primary h-screen text-white">
      <div className="w-full max-w-lg bg-gray-700 rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold text-center text-white">Sign Up</h2>
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter my nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring focus:gradient"
              required
            />
            <input
              type="text"
              placeholder="Enter valid id"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring focus:gradient"
              required
            />
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring focus:gradient"
              required
            />
            <p className="text-sm text-gray-400">
              비밀번호는 숫자, 영문 5자 이상 조합해야 합니다
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setProfileimg(e.target.files[0])}
              className="w-full p-3 rounded-lg bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring focus:gradient"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-button hover:bg-hover text-white py-3 rounded-lg font-bold transition duration-300"
          >
            Sign Up
          </button>
        </form>
        {message && <p className="mt-4 text-center text-red-400">{message}</p>}
      </div>
    </div>
  );
};

export default Signup;
