import React, { useState } from 'react';
import axios from 'axios';

const ChatSummary = () => {
  const [message, setMessage] = useState('');
  const [emotion, setEmotion] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');

  // 메시지와 감정 상태를 백엔드로 보내는 함수
  const handleSendMessage = async () => {
    try {
      const currentTimestamp = new Date().toISOString(); // 타임스탬프 생성

      const response = await axios.post('/api/chat/message/', {
        message,
        emotion,
        timestamp: currentTimestamp,
      });

      // 메시지 전송 후 요약 업데이트
      setMessage('');
      setEmotion('');
      setTimestamp(currentTimestamp);
      fetchSummary();
    } catch (err) {
      setError('메시지 전송 중 오류가 발생했습니다.');
    }
  };

  // 대화 요약을 가져오는 함수
  const fetchSummary = async () => {
    try {
      const response = await axios.get('/api/chat/summary/');
      setSummary(response.data.summary);
    } catch (err) {
      setError('대화 요약을 가져오는 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="chat-summary-container">
      <h2>캐릭터와의 대화</h2>

      {/* 메시지 입력 */}
      <div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="대화 메시지 입력"
        ></textarea>
        <input
          type="text"
          value={emotion}
          onChange={(e) => setEmotion(e.target.value)}
          placeholder="감정 입력 (예: happy, sad)"
        />
        <button onClick={handleSendMessage}>메시지 보내기</button>
      </div>

      {/* 대화 요약 출력 */}
      {error && <p className="error-message">{error}</p>}
      <div className="summary-container">
        <h3>대화 요약</h3>
        <pre>{summary || '대화 요약이 없습니다.'}</pre>
      </div>
    </div>
  );
};

export default ChatSummary;
