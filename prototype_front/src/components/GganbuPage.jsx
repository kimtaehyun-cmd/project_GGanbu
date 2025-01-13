import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CharacterModal from '../components/main/CharacterModal';
import './GganbuPage.css';

const GganbuPage = () => {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(null); // 드롭다운 상태 관리
  const [selectedCharacter, setSelectedCharacter] = useState(null); // 모달에 표시할 캐릭터
  const [showModal, setShowModal] = useState(false); // 모달 표시 여부

  useEffect(() => {
    const fetchFollowedCharacters = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const verifyResponse = await axios.get(
          `${process.env.REACT_APP_SERVER_DOMAIN}/verify-token`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const userId = verifyResponse.data.user_idx;
        const response = await axios.get(
          `${process.env.REACT_APP_SERVER_DOMAIN}/api/characters/user/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setCharacters(response.data);
        setLoading(false);
      } catch (error) {
        console.error('팔로우한 캐릭터 불러오기 실패:', error);
        setLoading(false);
      }
    };

    fetchFollowedCharacters();
  }, []);

  const handleDropdownToggle = (charIdx) => {
    setDropdownOpen(dropdownOpen === charIdx ? null : charIdx);
  };

  const handleEditCharacter = (charIdx) => {
    navigate(`/CharacterManager?edit=${charIdx}`);
  };

  const handleDeleteCharacter = async (charIdx) => {
    if (window.confirm('정말로 이 캐릭터를 삭제하시겠습니까?')) {
      try {
        await axios.delete(`${process.env.REACT_APP_SERVER_DOMAIN}/api/characters/${charIdx}`);
        setCharacters((prev) =>
          prev.filter((char) => char.char_idx !== charIdx)
        );
      } catch (error) {
        console.error('캐릭터 삭제 실패:', error);
      }
    }
  };

  const handleCharacterClick = (character) => {
    setSelectedCharacter(character); // 선택한 캐릭터를 설정
    setShowModal(true); // 모달 표시
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setShowModal(false); // 모달 숨김
  };

  console.log(characters)

  return (
    <div className="gganbu-container">
      <div className="gganbu-content">
        <div className="gganbu-main">
          <h1>내가 만든 캐릭터</h1>
          <div className="characters-row">
            {/* 캐릭터 만들기 박스 */}
            <div
              className="create-character-card-horizontal"
              onClick={() => navigate('/CharacterManager')}
            >
              <div className="plus-box">
                <span>+</span>
              </div>
              <div className="create-info">
                <h3 className="create-title">캐릭터 만들기</h3>
                <p className="create-subtitle">나만의 캐릭터를 만들어보세요!</p>
              </div>
            </div>

            {/* 캐릭터 카드 */}
            {characters.map((character) => (
              <div
                key={character.char_idx}
                className="character-card-horizontal"
                onClick={() => handleCharacterClick(character)}
              >
                <img
                  src={character.character_image || '/default-avatar.png'}
                  alt={character.char_name}
                  className="character-image-horizontal"
                />
                <div className="character-info-horizontal">
                  <h3>{character.char_name}</h3>
                  <p>{character.char_description}</p>
                </div>
                <div className="menu-container">
                  <button
                    className="menu-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDropdownToggle(character.char_idx);
                    }}
                  >
                    …
                  </button>
                  {dropdownOpen === character.char_idx && (
                    <div className="dropdown-menu">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // 이벤트 전파 방지
                          handleEditCharacter(character.char_idx);
                        }}
                      >
                        캐릭터 수정
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // 이벤트 전파 방지
                          handleDeleteCharacter(character.char_idx);
                        }}
                      >
                        캐릭터 삭제
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {showModal && selectedCharacter && (
        <CharacterModal
          character={selectedCharacter}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default GganbuPage;
