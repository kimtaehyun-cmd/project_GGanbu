import React, { useState } from 'react';
import axios from 'axios';
import './CharacterSearch.css';

const CharacterSearch = () => {
  const [query, setQuery] = useState(''); // 검색어 상태
  const [characters, setCharacters] = useState([]); // 검색된 캐릭터 목록
  const [error, setError] = useState(null); // 에러 상태
  const [resultsCount, setResultsCount] = useState(0); // 검색 결과 건수

  // 검색어 변경 핸들러
  const handleSearchChange = (e) => {
    setQuery(e.target.value);
  };

  // 검색 API 호출 핸들러
  const handleSearch = async () => {
    if (!query.trim()) {
      setError('검색어를 입력해주세요.');
      setCharacters([]);
      setResultsCount(0);
      return;
    }
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_SERVER_DOMAIN}/api/characters/search?query=${query}`
      );
      setCharacters(response.data); // 검색 결과 설정
      setResultsCount(response.data.length); // 결과 건수 설정
      setError(null); // 에러 초기화
    } catch (err) {
      setError('검색 결과가 없습니다.');
      setCharacters([]);
      setResultsCount(0);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleSearch(); // 엔터키 입력 시 검색 실행
    }
  };

  return (
    <div className="container">
      <div className="search-container">
        <input
          type="text"
          placeholder="캐릭터 검색"
          value={query}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          className="search-input"
        />
        <button onClick={handleSearch} className="search-button">
          검색
        </button>
      </div>

      <div className="results-container">
        {/* 에러 메시지 표시 */}
        {error && <p className="error-message">{error}</p>}

        {/* 검색 결과 문구 */}
        {!error && query.trim() && resultsCount > 0 && (
          <>
            <p className="search-summary">
              “<span className="query-highlight">{query}</span>” 검색 결과
            </p>
            <p className="result-count">{resultsCount}건</p>
          </>
        )}

        {/* 검색 결과 리스트 */}
        {characters.length > 0 && (
          <ul className="character-list">
            {characters.map((char) => (
              <li key={char.id} className="character-card">
                <h3 className="character-name">{char.name}</h3>
                <p className="character-description">{char.description}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CharacterSearch;
