import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ChatRoom from './ChatRoom'; // 채팅창 UI 컴포넌트
import axios from 'axios';
import logo from '../assets/logo.png'; // 로고 이미지 import
import './ChatPage.css';
import { getUserIdxFromToken } from './main/utils/authUtils';

function ChatPage() {
  const { chatRoomId } = useParams(); // URL에서 chatRoomId 가져오기
  const navigate = useNavigate();
  const [chatRooms, setChatRooms] = useState([]); // 채팅방 목록
  const [selectedRoomId, setSelectedRoomId] = useState(''); // 선택된 채팅방 ID
  const [selectedRoomName, setSelectedRoomName] = useState(''); // 선택된 채팅방 이름
  const [selectedRoomImg, setSelectedRoomImg] = useState(''); // 선택된 채팅방 이미지
  const isFetched = useRef(false);

  const user_idx = getUserIdxFromToken(); // 함수 호출

  // 채팅방 목록 가져오기
  const fetchRooms = async () => {
    if (!user_idx) {
      toast.error('로그인이 필요합니다');
      navigate('/signin');
      return;
    }
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_SERVER_DOMAIN}/api/chat-room/user/${user_idx}`
      );
      setChatRooms(response.data);
    } catch (error) {
      console.error('채팅방 목록 불러오기 오류:', error);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (
      !window.confirm(
        '삭제된 대화는 다시 복구될 수 없어요.\n정말 삭제하시겠어요?'
      )
    ) {
      return; // 취소 시 삭제 중단
    }

    try {
      // 삭제 API 호출
      await axios.delete(`${process.env.REACT_APP_SERVER_DOMAIN}/api/chat-room/${roomId}`);
      toast.success('채팅방이 삭제되었습니다.');

      // 삭제 후 채팅방 목록 갱신
      fetchRooms();
    } catch (error) {
      console.error('채팅방 삭제 오류:', error);
      toast.error('채팅방 삭제 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    if (!isFetched.current) {
      fetchRooms();
      isFetched.current = true; // 한 번만 실행되도록 설정
    }
  }, [user_idx]);

  useEffect(() => {
    if (chatRoomId) {
      const room = chatRooms.find((room) => room.room_id === chatRoomId);
      if (room) {
        setSelectedRoomId(room.room_id);
        setSelectedRoomName(room.character_name);
        setSelectedRoomImg(room.character_image);
      }
    } else {
      setSelectedRoomId('');
      setSelectedRoomName('');
      setSelectedRoomImg('');
    }
  }, [chatRoomId, chatRooms]);

  return (
    <div className="chat-container">
      <div className="chat-body">
        {/* 채팅방 목록 */}
        <div className="chat-list-container">
          <div className="chat-list-header">채팅 내역</div>
          <div className="chat-list">
            {chatRooms.map((room) => (
              <div
                key={room.room_id}
                className={`chat-item ${
                  selectedRoomId === room.room_id ? 'selected' : ''
                }`}
                onClick={() => {
                  navigate(`/ChatPage/${room.room_id}`); // URL 변경
                }}
              >
                <img
                  src={room.character_image}
                  alt="Character"
                  className="avatar"
                />
                <div className="chat-item-content">
                  <div className="character-name">{room.character_name}</div>
                </div>
                <i
                  className="delete-icon fas fa-trash"
                  onClick={(e) => {
                    e.stopPropagation(); // 부모 클릭 이벤트 막기
                    handleDeleteRoom(room.room_id);
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 채팅방 UI */}
        <div className="chat-room-container">
          {chatRoomId ? (
            <ChatRoom
              roomId={chatRoomId}
              roomName={selectedRoomName}
              roomImg={selectedRoomImg}
              onLeaveRoom={() => navigate('/ChatPage')}
            />
          ) : (
            <div className="logo-container">
              <img src={logo} alt="Logo" className="main-logo" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
