import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TTSPage.css';

function TestPage() {
  const [text, setText] = useState('');
  const [speaker, setSpeaker] = useState(''); // 기본값 설정
  const [language, setLanguage] = useState('KO');
  const [speed, setSpeed] = useState(1.0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false); // 로딩 상태 추가
  const [characterOptions, setCharacterOptions] = useState([]); // DB에서 불러온 캐릭터 목록

  useEffect(() => {
    // API에서 캐릭터 목록 가져오기
    const fetchCharacterOptions = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_SERVER_DOMAIN}/api/voices/`);
        const options = response.data.map((voice) => ({
          name: voice.voice_speaker, // 캐릭터 이름
          value: voice.voice_speaker, // 모델 스피커 이름
        }));
        setCharacterOptions(options);

        // 기본값 설정 (첫 번째 캐릭터)
        if (options.length > 0) {
          setSpeaker(options[0].value); // `value`로 기본값 설정
        }
      } catch (error) {
        console.error('Error fetching character options:', error);
        alert('캐릭터 목록을 가져오는 중 오류가 발생했습니다.');
      }
    };

    fetchCharacterOptions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // 요청 시작 시 로딩 상태 활성화
    setAudioUrl(null); // 이전 오디오 URL 초기화

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_SERVER_DOMAIN}/generate-tts/`,
        {
          text: text,
          speaker: speaker, // 선택한 캐릭터 값 사용
          language: language,
          speed: parseFloat(speed),
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer', // 오디오 파일을 받을 때 arraybuffer 사용
        }
      );

      console.log('response :', response);
      // Blob 생성 및 URL 생성
      const audioBlob = new Blob([response.data], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioUrl(audioUrl);
    } catch (error) {
      console.error('Error generating TTS:', error);
      if (error.code === 'ERR_BAD_RESPONSE') {
        alert('TTS 서버 오류 : TTS 서버를 확인하세요.');
      } else {
        alert('TTS 생성 중 오류가 발생했습니다. 입력 데이터를 확인하세요.');
      }
    } finally {
      setLoading(false); // 로딩 상태 비활성화
    }
  };

  return (
    <div className="test-page">
      <h1>TTS Test Page</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="text">Text:</label>
          <input
            className="tts-input"
            type="text"
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="speaker">Select Character:</label>
          <select
            className="tts-select"
            id="speaker"
            value={speaker}
            onChange={(e) => setSpeaker(e.target.value)}
            required
          >
            {characterOptions.map((character) => (
              <option key={character.value} value={character.value}>
                {character.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="language">Language:</label>
          <select
            className="tts-lang"
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="KO">한국어</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="speed">Speed:</label>
          <input
            className="tts-input"
            type="number"
            id="speed"
            value={speed}
            step="0.1"
            min="0.5"
            max="2.0"
            onChange={(e) => setSpeed(e.target.value)}
          />
        </div>
        <button
          className="generate-tts-button"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate TTS'}
        </button>
      </form>

      {audioUrl && (
        <div className="audio-player">
          <h2>Generated Audio:</h2>
          <audio controls>
            <source src={audioUrl} type="audio/wav" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
}

export default TestPage;
