import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import './ChatRoom.css';
import userProfile from '../assets/user.png';
import { FiVolume2 } from 'react-icons/fi'; // 사운드 아이콘

const ChatRoom = ({ roomId, roomName, roomImg, onLeaveRoom }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [roomInfo, setRoomInfo] = useState(null);
  const [isTyping, setIsTyping] = useState(false); // 챗봇이 타이핑 중인지 확인하는 상태
  const [ws, setWs] = useState(null);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null); // WebSocket 객체를 유지하는 ref

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_SERVER_DOMAIN}/api/chat/${roomId}`
      );
      const logs = response.data.map((log) => ({ content: log.log }));

      const parsedMessages = logs.flatMap((log) => {
        // log.content가 없는 경우 빈 배열 반환
        if (!log.content) {
          console.warn('log.content가 비어 있습니다:', log);
          return [];
        }

        const lines = log.content
          .split('\n')
          .filter((line) => line.trim() !== '');

        // 첫 줄과 마지막 줄 제외
        const mainLines = lines.slice(1, -1);

        // 메시지 데이터로 변환
        return mainLines
          .map((line) => {
            try {
              const timestampMatch = line.match(/^\[(.*?)\]/); // 타임스탬프 추출
              const senderMatch = line.match(/user:|chatbot:/); // 발신자 추출

              if (!timestampMatch || !senderMatch) return null; // 유효하지 않은 경우 건너뜀

              const timestamp = timestampMatch[1]; // 예: "2025-01-07 20:03:36"
              const sender = line.includes('user:') ? 'user' : 'chatbot';
              const content = line.split(': ').slice(1).join(': ').trim(); // 메시지 내용 추출

              return {
                sender,
                content,
                timestamp,
              };
            } catch (parseError) {
              console.error('메시지 파싱 중 오류:', line, parseError);
              return null;
            }
          })
          .filter(Boolean); // null 값 제거
      });

      setMessages(parsedMessages); // 상태 업데이트
    } catch (error) {
      console.error(
        '메시지 가져오기 오류:',
        error.response?.data || error.message
      );
    }
  };

  const fetchRoomInfo = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_SERVER_DOMAIN}/api/chat-room-info/${roomId}`
      );
      console.log('채팅방 정보:', response.data);
      setRoomInfo(response.data);
    } catch (error) {
      console.error(
        '채팅방 정보 가져오기 오류:',
        error.response?.data || error.message
      );
    }
  };

  // WebSocket 연결 초기화
  useEffect(() => {
    if (!roomId) return;

    if (!wsRef.current) {
      const websocket = new WebSocket(
        `${process.env.REACT_APP_WS_SERVER_DOMAIN}/ws/generate/?room_id=${roomId}`
      );
      wsRef.current = websocket;

      websocket.onopen = () => {
        console.log('WebSocket 연결 성공');
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          const botMessage = {
            sender: roomInfo?.character_name || 'bot',
            content: data.text,
            timestamp: new Date().toISOString(),
          };

          setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
          console.error('WebSocket 메시지 수신 오류:', error.message);
        }
      };

      websocket.onclose = (event) => {
        console.log('WebSocket 연결 종료:', event.code, event.reason);
        console.log(event.reason);
        wsRef.current = null;
      };

      setWs(websocket);

      websocket.onerror = (error) => {
        console.error('WebSocket 오류:', error);
      };
    }

    return () => {
      wsRef.current?.close(); // 컴포넌트 언마운트 시 WebSocket 종료
      wsRef.current = null; // WebSocket 참조 해제
    };
  }, [roomId]); // roomId가 변경될 때만 새 WebSocket 초기화

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !roomInfo || !ws) return;

    try {
      const userMessage = {
        sender: 'user',
        content: input,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) =>
        [...prev, userMessage].sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        )
      );
      setInput(''); // 입력 필드 초기화

      // 챗봇이 타이핑 중임을 나타냄
      setIsTyping(true);

      const response = await axios.post(
        `${process.env.REACT_APP_SERVER_DOMAIN}/api/chat/${roomId}`,
        {
          sender: 'user',
          content: input,
        }
      );

      if (response.data && response.data.bot) {
        const botMessage = {
          sender: roomInfo.character_name,
          content: response.data.bot,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) =>
          [...prev, botMessage].sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
          )
        );
        await fetchRoomInfo();
      }
    } catch (error) {
      console.error(
        '메시지 전송 오류:',
        error.response?.data?.detail || error.message
      );
      alert('메시지 전송 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      // 챗봇이 응답을 완료하면 타이핑 상태를 false로 변경
      setIsTyping(false);
    }
  };

  const playTTS = async (text) => {
    if (!roomInfo) return;

    try {
      // TTS API 호출
      const response = await axios.post(
        `${process.env.REACT_APP_SERVER_DOMAIN}/generate-tts/`,
        {
          text: text,
          speaker: roomInfo.voice_speaker,
          language: 'KO', // 언어 고정
          speed: 1.0, // 속도 설정 (roomInfo에서 가져오거나 고정값)
        },
        {
          responseType: 'arraybuffer',
        }
      );

      // 반환된 데이터로 오디오 재생
      const audioBlob = new Blob([response.data], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (error) {
      console.error('TTS 호출 오류:', error.response?.data || error.message);
      alert('TTS 요청 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (roomId) {
      fetchMessages();
      fetchRoomInfo();
    }
  }, [roomId]);

  return (
    <div className="chat-room">
      <div className="chat-header">
        <button className="back-button" onClick={onLeaveRoom}>
          &lt;
        </button>
        <div className="header-content">
          <p>'{roomName}' 와의 채팅방</p>
          {roomInfo ? (
            <div className="character-status">
              <p>호감도: {roomInfo.favorability}</p>
            </div>
          ) : (
            <p>채팅방 정보를 불러오는 중...</p>
          )}
        </div>
      </div>
      <div className="chatroom-chat-messages">
        {messages.map((msg, idx) => {
          const isUser = msg.sender === 'user';
          const currentDate = new Date(msg.timestamp).toLocaleDateString();
          const previousDate =
            idx > 0
              ? new Date(messages[idx - 1].timestamp).toLocaleDateString()
              : null;

          const shouldShowDate = currentDate !== previousDate;

          return (
            <React.Fragment key={idx}>
              {shouldShowDate && (
                <div className="date-separator">
                  <div className="line"></div>
                  <span className="date">{currentDate}</span>
                  <div className="line"></div>
                </div>
              )}
              <div className={`message ${isUser ? 'user' : 'bot'}`}>
                {!isUser && <img src={roomImg} alt="bot" className="avatar" />}
                <div className="bubble-container">
                  <div className="bubble">{msg.content}</div>
                  <div className="timestamp-container">
                    <div className="timestamp">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    {!isUser && (
                      <FiVolume2
                        className="sound-icon"
                        onClick={() => playTTS(msg.content)}
                        title="TTS 재생"
                      />
                    )}
                  </div>
                </div>
                {isUser && (
                  <img src={userProfile} alt="user" className="avatar" />
                )}
              </div>
            </React.Fragment>
          );
        })}
        {isTyping && (
          <div className="message bot">
            <div className="bubble-container">
              <div className="bubble">
                {roomInfo && roomInfo.character_name && (
                  <div className="typing-dots">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input" onSubmit={sendMessage}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지를 입력하세요..."
        />
        <button type="submit">전송</button>
      </form>
    </div>
  );
};

export default ChatRoom;
