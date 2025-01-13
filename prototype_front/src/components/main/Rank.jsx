import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Rank = () => {
  const [message, setMessage] = useState('');
  const [topCharacters, setTopCharacters] = useState([]);
  const [topFields, setTopFields] = useState([]); // 필드 TOP 3 상태 추가
  const [topTags, setTopTags] = useState([]); // 태그 TOP 3 상태 추가
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setMessage('로그인이 필요합니다.');
        setIsLoggedIn(false);
        return;
      }

      try {
        const verifyResponse = await axios.get(
          `${process.env.REACT_APP_SERVER_DOMAIN}/verify-token`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const { user_idx } = verifyResponse.data;
        if (!user_idx)
          throw new Error('유효한 사용자 정보를 찾을 수 없습니다.');

        setIsLoggedIn(true);

        // 캐릭터 TOP 3 데이터 가져오기
        const { data: characters } = await axios.get(
          `${process.env.REACT_APP_SERVER_DOMAIN}/api/characters/top3/${user_idx}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setTopCharacters(characters);

        // 필드 TOP 3 데이터 가져오기
        const { data: fields } = await axios.get(
          `${process.env.REACT_APP_SERVER_DOMAIN}/api/fields/top3/${user_idx}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setTopFields(fields.top_fields); // 필드 데이터 설정

        // 태그 TOP 3 데이터 가져오기
        const { data: tags } = await axios.get(
          `${process.env.REACT_APP_SERVER_DOMAIN}/api/tags/top3/${user_idx}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setTopTags(tags.top_tags); // 태그 데이터 설정
      } catch (error) {
        console.error('데이터를 가져오는 중 오류 발생:', error);
        setMessage('데이터를 가져오는 중 오류가 발생했습니다.');
        setIsLoggedIn(false);
      }
    };

    fetchData();
  }, []);

  if (!isLoggedIn) {
    return <div className="text-center text-red-500 font-bold">{message}</div>;
  }

  return (
    <div className="p-4">
      <div className="mt-6 w-full text-center">
        <h3 className="text-2xl font-semibold mb-4">최고의 대화친구 Top3</h3>
        {topCharacters.length > 0 ? (
          <div className="flex justify-center items-end">
            {topCharacters.map((character, index) => (
              <div
                key={character.char_idx}
                className={`flex flex-col items-center ${
                  index === 0
                    ? 'order-2 mx-2'
                    : index === 1
                    ? 'order-1 mx-2'
                    : 'order-3 mx-2'
                }`}
              >
                <div
                  className={`relative flex items-center justify-center rounded-lg border-4 ${
                    index === 0
                      ? 'w-64 h-64 border-yellow-400'
                      : index === 1
                      ? 'w-52 h-52 border-gray-400'
                      : 'w-48 h-48 border-orange-400'
                  }`}
                >
                  <span
                    className={`absolute -top-4 text-sm font-bold px-3 py-2 rounded-full ${
                      index === 0
                        ? 'bg-yellow-400 text-black'
                        : index === 1
                        ? 'bg-gray-400 text-black'
                        : 'bg-orange-400 text-black'
                    }`}
                  >
                    {index === 0 ? '🥇1등' : index === 1 ? '🥈2등' : '🥉3등'}
                  </span>
                  <img
                    src={
                      character.character_image || '/default-placeholder.png'
                    }
                    alt={character.char_name || 'No Image Available'}
                    onError={(e) => {
                      e.target.src = '/default-placeholder.png';
                    }}
                    className={`object-cover w-full h-full`}
                  />
                </div>
                <h4 className="text-xl font-bold mt-3">
                  {character.char_name}
                </h4>
              </div>
            ))}
          </div>
        ) : (
          <p>Top3 캐릭터 데이터가 없습니다.</p>
        )}
      </div>
      <div className="mt-8 w-full text-center">
        <h3 className="text-2xl font-semibold mb-4">최고의 필드 Top3</h3>
        {topFields.length > 0 ? (
          <div className="flex justify-center items-end">
            {topFields.map((field, index) => (
              <div
                key={field.field_idx}
                className={`flex flex-col items-center ${
                  index === 0
                    ? 'order-2 mx-2'
                    : index === 1
                    ? 'order-1 mx-2'
                    : 'order-3 mx-2'
                }`}
              >
                <div
                  className={`relative flex items-center justify-center rounded-lg border-4 ${
                    index === 0
                      ? 'w-64 h-64 border-yellow-400'
                      : index === 1
                      ? 'w-52 h-52 border-gray-400'
                      : 'w-48 h-48 border-orange-400'
                  }`}
                >
                  <span
                    className={`absolute -top-4 text-sm font-bold px-3 py-2 rounded-full ${
                      index === 0
                        ? 'bg-yellow-400 text-black'
                        : index === 1
                        ? 'bg-gray-400 text-black'
                        : 'bg-orange-400 text-black'
                    }`}
                  >
                    {index === 0 ? '🥇1등' : index === 1 ? '🥈2등' : '🥉3등'}
                  </span>
                  <div className="text-center">
                    <h4 className="text-lg font-semibold">
                      {field.field_category}
                    </h4>
                    <p className="text-sm mt-2">
                      캐릭터 수: {field.char_count}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center">Top3 필드 데이터가 없습니다.</p>
        )}
      </div>
      <div className="mt-8 w-full text-center">
        <h3 className="text-2xl font-semibold mb-4">최고의 태그 Top3</h3>
        {topTags.length > 0 ? (
          <div className="flex justify-center items-end">
            {topTags.map((tag, index) => (
              <div
                key={index}
                className={`flex flex-col items-center ${
                  index === 0
                    ? 'order-2 mx-2'
                    : index === 1
                    ? 'order-1 mx-2'
                    : 'order-3 mx-2'
                }`}
              >
                <div
                  className={`relative flex items-center justify-center rounded-lg border-4 ${
                    index === 0
                      ? 'w-64 h-64 border-yellow-400'
                      : index === 1
                      ? 'w-52 h-52 border-gray-400'
                      : 'w-48 h-48 border-orange-400'
                  }`}
                >
                  <span
                    className={`absolute -top-4 text-sm font-bold px-3 py-2 rounded-full ${
                      index === 0
                        ? 'bg-yellow-400 text-black'
                        : index === 1
                        ? 'bg-gray-400 text-black'
                        : 'bg-orange-400 text-black'
                    }`}
                  >
                    {index === 0 ? '🥇1등' : index === 1 ? '🥈2등' : '🥉3등'}
                  </span>
                  <div className="text-center">
                    <h4 className="text-lg font-semibold">{tag.tag_name}</h4>
                    <p className="text-sm mt-2">사용 횟수: {tag.tag_count}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center">Top3 태그 데이터가 없습니다.</p>
        )}
      </div>
    </div>
  );
};

export default Rank;
