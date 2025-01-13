import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import CharacterCard from "./CharacterCard";
import CharacterModal from "./CharacterModal";

const FieldSearch = () => {
  const [searchParams] = useSearchParams();
  const fieldId = searchParams.get("field"); // 필드 ID를 URL에서 가져오기
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [selectedCharacter, setSelectedCharacter] = useState(null);

  useEffect(() => {
    const fetchFieldCharacters = async () => {
      if (!fieldId) {
        setError("필드 ID가 제공되지 않았습니다.");
        return;
      }

      try {
        const response = await axios.get(
          `${process.env.REACT_APP_SERVER_DOMAIN}/api/characters/field?fields=${fieldId}`
        );
        setResults(response.data);
        if (response.data.length === 0) {
          setError("검색 결과가 없습니다.");
        } else {
          setError(""); // 이전 오류 메시지를 제거
        }
      } catch (err) {
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
      }
    };

    fetchFieldCharacters();
  }, [fieldId]);
  console.log("results", results);
  return (
    <div className="min-h-screen bg-primary p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          필드 {fieldId}의 캐릭터
        </h1>

        {error ? (
          <p className="text-red-500 text-center">{error}</p>
        ) : (
          <div className="search-results-grid">
            {results.map((character, index) => (
              <CharacterCard
                key={`card-${character.char_idx}-${index}`}
                card={character}
                index={index}
                onClick={() => setSelectedCharacter(character)}
              />
            ))}
          </div>
        )}

        {selectedCharacter && (
          <CharacterModal
            character={selectedCharacter}
            onClose={() => setSelectedCharacter(null)}
          />
        )}
      </div>
    </div>
  );
};

export default FieldSearch;
