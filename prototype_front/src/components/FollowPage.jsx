import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CharacterModal from '../components/main/CharacterModal';
import './FollowPage.css';

const FollowPage = () => {
  const navigate = useNavigate();
  const [followedCharacters, setFollowedCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null); // 드롭다운 상태 관리
  const [userIdx, setUserIdx] = useState(null); // 로그인한 사용자 ID 저장

  useEffect(() => {
    const fetchFollowedCharacters = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          alert('로그인이 필요합니다.');
          navigate('/signin');
          return;
        }
        const parsedToken = JSON.parse(atob(token.split('.')[1]));
        setUserIdx(parsedToken.user_idx); // 로그인한 사용자 ID 저장
        const response = await axios.get(
          `${process.env.REACT_APP_SERVER_DOMAIN}/api/friends/${parsedToken.user_idx}/characters`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setFollowedCharacters(response.data);
        setLoading(false);
      } catch (error) {
        console.error('팔로우한 캐릭터 불러오기 실패:', error);
        setLoading(false);
      }
    };

    fetchFollowedCharacters();
  }, [navigate]);

  const handleCharacterClick = (character) => {
    setSelectedCharacter(character);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

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
        setFollowedCharacters((prev) =>
          prev.filter((char) => char.char_idx !== charIdx)
        );
      } catch (error) {
        console.error('캐릭터 삭제 실패:', error);
      }
    }
  };

  return (
    <div className="follow-container">
      <div className="follow-content">
        <div className="follow-main">
          <h1>내가 팔로우한 캐릭터</h1>
          {loading ? (
            <p>로딩 중...</p>
          ) : followedCharacters.length === 0 ? (
            <p>팔로우한 캐릭터가 없습니다.</p>
          ) : (
            <div className="follow-characters-row">
              {followedCharacters.map((character) => (
                <div
                  key={character.char_idx}
                  className="follow-character-card-horizontal"
                  onClick={() => handleCharacterClick(character)}
                >
                  {console.log('userIdx:', userIdx)}
                  {console.log('character_owner:', character.character_owner)}

                  <img
                    src={character.character_image || '/default-avatar.png'}
                    alt={character.char_name}
                    className="follow-character-image-horizontal"
                  />
                  <div className="follow-character-info-horizontal">
                    <h3>{character.char_name}</h3>
                    <p>{character.char_description}</p>
                  </div>
                  {/* 본인 캐릭터일 때만 메뉴 버튼 표시 */}
                  {userIdx === character.character_owner && (
                    <div className="menu-container">
                      <button
                        className="menu-button"
                        onClick={(e) => {
                          e.stopPropagation(); // 클릭 이벤트 전파 방지
                          handleDropdownToggle(character.char_idx);
                        }}
                      >
                        …
                      </button>
                      {dropdownOpen === character.char_idx && (
                        <div className="dropdown-menu">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // 클릭 이벤트 전파 방지
                              handleEditCharacter(character.char_idx);
                            }}
                          >
                            캐릭터 수정
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // 클릭 이벤트 전파 방지
                              handleDeleteCharacter(character.char_idx);
                            }}
                          >
                            캐릭터 삭제
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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

export default FollowPage;
