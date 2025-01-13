import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import CharacterCard from './CharacterCard';
import CharacterModal from './CharacterModal';

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) return;

      try {
        const response = await axios.get(
          `${process.env.REACT_APP_SERVER_DOMAIN}/api/characters/`
        );
        const filteredResults = response.data.filter(
          (character) =>
            character.char_name.toLowerCase().includes(query.toLowerCase()) ||
            character.char_description
              .toLowerCase()
              .includes(query.toLowerCase())
        );

        setResults(filteredResults);
        if (filteredResults.length === 0) {
          setError('검색 결과가 없습니다.');
        }
      } catch (err) {
        setError('검색 중 오류가 발생했습니다.');
      }
    };

    fetchResults();
  }, [query]);

  console.log("results", results);
  return (
    <div className="min-h-screen bg-primary p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          "{query}" 검색 결과
        </h1>

        {error ? (
          <p className="text-red-500 text-center">{error}</p>
        ) : (
          <div
            className={`search-results-grid ${
              results.length === 1 ? 'single-result' : ''
            }`}
          >
            {results.map((card, index) => (
              <CharacterCard
                key={`card-${card.char_idx}-${index}`}
                card={card}
                index={index}
                onClick={() => setSelectedCharacter(card)}
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

export default Search;
