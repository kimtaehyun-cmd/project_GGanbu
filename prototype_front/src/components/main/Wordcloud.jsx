import React, { useState } from 'react';
import axios from 'axios';

const Wordcloud = () => {
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWordcloud = async () => {
    const token = localStorage.getItem('authToken'); // 토큰 가져오기
    const userIdx = localStorage.getItem('user_idx');
    if (!userIdx) {
      alert('로그인이 필요합니다.');
      window.location.href = '/signin';
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `${process.env.REACT_APP_SERVER_DOMAIN}/api/user-wordcloud/${userIdx}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: 'blob', // 이미지 데이터를 blob 형식으로 받기
        }
      );

      const imageURL = URL.createObjectURL(response.data);
      setImageSrc(imageURL);
    } catch (err) {
      console.error(err);
      setError('워드클라우드를 생성하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wordcloud-container w-full h-screen flex flex-col justify-center items-center gap-y-10 mb-40">
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {imageSrc && (
        <div className="w-full flex justify-center">
          <img
            src={imageSrc}
            alt="User Wordcloud"
            style={{
              maxWidth: '90%', // 가로 크기 제한
              maxHeight: '70vh', // 세로 크기 제한
              objectFit: 'contain', // 이미지 비율 유지
              border: '1px solid #ccc', // 경계선 추가
              padding: '10px',
            }}
          />
        </div>
      )}
      <button
        onClick={fetchWordcloud}
        disabled={loading}
        className={`w-1/6 text-center py-2 px-4 rounded-lg font-semibold text-white ${
          loading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-button hover:bg-hover  shadow-md hover:shadow-lg transition duration-300'
        }`}
      >
        {loading ? '생성 중...' : 'Wordcloud 생성'}
      </button>
    </div>
  );
};

export default Wordcloud;
