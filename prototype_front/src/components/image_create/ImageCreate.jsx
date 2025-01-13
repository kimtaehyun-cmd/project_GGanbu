import React, { useState } from 'react';
import axios from 'axios';
import './ImageCreate.css';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// 프롬프트 데이터를 가져옴
import {
  STYLE_PROMPTS,
  BACKGROUND_PROMPTS,
  FILTER_PROMPTS,
  BASE_PROMPT,
  EXCLUDED_PROMPT,
} from '../../promts/ImagePrompts';

const ImageCreate = () => {
  // 상태 관리=====
  const [basePrompt] = useState(BASE_PROMPT); // 기본 프롬프트
  const [excludedPrompt] = useState(EXCLUDED_PROMPT); // 제외된 프롬프트
  const [customPrompt, setCustomPrompt] = useState(''); // 사용자 정의 프롬프트

  const [stylePrompt, setStylePrompt] = useState(''); // 그림체
  const [backgroundPrompt, setBackgroundPrompt] = useState(''); // 배경
  const [filterPrompt, setFilterPrompt] = useState(''); // 필터 스타일
  const [generatedImage, setGeneratedImage] = useState(null); // 생성된 이미지
  const [loading, setLoading] = useState(false); // 로딩 상태
  const navigate = useNavigate(); // 뒤오가기 버튼

  // 배경 실내/실외 선택 처리 값
  const [indoorSelected, setIndoorSelected] = useState(''); // 실내 선택된 값
  const [outdoorSelected, setOutdoorSelected] = useState(''); // 실외 선택된 값

  // 카테고리별 상태 관리
  const [selectedOptions, setSelectedOptions] = useState({
    style: '',
    background: '',
    filter: '',
  });

  // 새 상태 변수 정의
  const [dimensions, setDimensions] = useState({ width: 512, height: 512 }); // Default dimensions
  const [guidanceScale, setGuidanceScale] = useState(7.5); // Default guidance scale
  const [numInferenceSteps, setNumInferenceSteps] = useState(50); // Default number of inference steps

  // ======= 옵션 변경 함수 =======
  const handleOptionChange = (category, option) => {
    const promptData = {
      style: STYLE_PROMPTS,
      background: BACKGROUND_PROMPTS,
      filter: FILTER_PROMPTS,
    };

    // 이전 선택 항목이 있을 경우 초기화
    if (category === 'style') {
      setStylePrompt((prev) =>
        prev === promptData[category][option]
          ? ''
          : promptData[category][option]
      );
    } else if (category === 'background') {
      setBackgroundPrompt((prev) =>
        prev === promptData[category][option]
          ? ''
          : promptData[category][option]
      );
    } else if (category === 'filter') {
      setFilterPrompt((prev) =>
        prev === promptData[category][option]
          ? ''
          : promptData[category][option]
      );
    }

    // 선택된 옵션 상태 갱신
    setSelectedOptions((prev) => {
      const updatedOptions = {
        ...prev,
        [category]: prev[category] === option ? '' : option,
      };
      return updatedOptions;
    });
  };

  // ======= 전체 프롬프트 생성 함수 =======
  const getFullPrompt = () => {
    const prompts = [
      basePrompt,
      stylePrompt,
      backgroundPrompt,
      filterPrompt,
      customPrompt,
    ]
      .filter(Boolean)
      .join(', ');
    console.log(`전체 프롬프트:`, prompts);
    return prompts;
  };

  // 이미지 생성 함수
  const handleGenerateImage = async () => {
    const fullPrompt = getFullPrompt();

    if (!fullPrompt.trim()) {
      alert('프롬프트를 입력하세요!');
      return;
    }

    setLoading(true);
    setGeneratedImage(null);

    console.log('Sending request with full prompt:', fullPrompt);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_SERVER_DOMAIN}/generate-image/`,
        {
          prompt: fullPrompt,
          negative_prompt: excludedPrompt,
          width: dimensions.width,
          height: dimensions.height,
          guidance_scale: parseFloat(guidanceScale),
          num_inference_steps: parseInt(numInferenceSteps, 10),
        }
      );

      console.log('전달한 메시지:', response.data);
      setGeneratedImage(`data:image/png;base64,${response.data.image}`);
    } catch (error) {
      console.error('이미지 생성 오류:', error);
      alert('이미지 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ============프롬프트 선택지================

  // 드롭다운 선택 시 width와 height를 설정하는 함수
  const handleDimensionChange = (value) => {
    const options = {
      square: { width: 512, height: 512 }, // 정사각형
      portrait: { width: 512, height: 880 }, // 세로형
      landscape: { width: 880, height: 512 }, // 가로형
    };
    console.log(`Dimension selected: ${value}`, options[value]);
    setDimensions(options[value]);
  };

  // 그림체 선택
  const handleStyleChange = (style) => {
    const styles = {
      cute: 'cute',
      powerful: 'powerful',
      retro: 'retro',
      cyberpunk: 'cyberpunk',
    };
    console.log(`Style selected: ${style}`, styles[style]);
    setStylePrompt(styles[style]);
  };

  // 배경 선택
  const handleBackgroundChange = (background, category) => {
    const backgrounds = {
      beach: 'ocean view, on the beach',
      starrySky: 'starry sky, night with stars',
      forest: 'green forest, lot of trees',
      castle: 'ancient castle, majestic architecture',
      classroom: 'inside a classroom, desks and chairs',
      concertStage: 'on concert stage, spotlights and crowd',
      corridor: 'long corridor, bright lights',
      cafe: 'inside a cozy cafe, tables and coffee cups',
    };
    // 실내와 실외 선택지는 상호 배타적이므로 다른 카테고리 선택 시 초기화
    if (category === 'indoor') {
      setOutdoorSelected(''); // 실외 선택 초기화
    } else if (category === 'outdoor') {
      setIndoorSelected(''); // 실내 선택 초기화
    }

    console.log(`Background selected: ${background}`, backgrounds[background]);
    setBackgroundPrompt(backgrounds[background]);
    if (category === 'indoor') {
      setIndoorSelected(background); // 실내 선택된 값 업데이트
    } else {
      setOutdoorSelected(background); // 실외 선택된 값 업데이트
    }
  };

  // 필터 스타일 선택
  const handleFilterChange = (filter) => {
    const filters = {
      natural: 'natural daylight',
      neon: 'neon lighting',
      cold: 'cold lighting',
      rainbow: 'rainbow light',
    };
    console.log(`Filter selected: ${filter}`, filters[filter]);
    setFilterPrompt(filters[filter]);
  };

  // Num Inference Steps(노이즈 제거 단계)
  const handleInferenceStepChange = (value) => {
    const options = {
      low: 30, // Low 단계
      normal: 50, // Normal 단계
      high: 60, // High 단계
    };
    console.log(`Noise step selected: ${value}`, options[value]);
    setNumInferenceSteps(options[value]);
  };

  const handleGuidanceScale = (value) => {
    const options = {
      low: 6.5,
      normal: 7.5,
      high: 8.5,
    };
    console.log(`Guidance scale selected: ${value}`, options[value]);
    setGuidanceScale(options[value]);
  };

  return (
    <div className="imageCreate-container">
      <div className="image-create-title">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h1>Custom Your Character Image</h1>
      </div>
      <br />
      <div className="image-create-area">
        <div className="image-create-left">
          {/* 그림체 선택 */}
          <div className="choose-image-style">
            <h3>Style</h3>
            {['일본 애니풍', '실사풍', '레트로 감성', '사이버펑크'].map(
              (style) => (
                <button
                  key={style}
                  className={selectedOptions.style === style ? 'active' : ''}
                  onClick={() => handleOptionChange('style', style)}
                >
                  {style}
                </button>
              )
            )}
            <br />
          </div>

          {/* 배경 선택 */}
          <div className="choose-bg-style">
            <h3>Background</h3>
            <div className="bg-outdoor">
              <h4>Outdoor</h4>
              {['해변가', '푸른 하늘', '숲', '판타지 성'].map((background) => (
                <button
                  key={background}
                  className={
                    selectedOptions.background === background ? 'active' : ''
                  }
                  onClick={() => handleOptionChange('background', background)}
                >
                  {background}
                </button>
              ))}
            </div>

            <div className="bg-indoor">
              <h4>Indor</h4>
              {['교실', '무대', '복도', '카페'].map((background) => (
                <button
                  key={background}
                  className={
                    selectedOptions.background === background ? 'active' : ''
                  }
                  onClick={() => handleOptionChange('background', background)}
                >
                  {background}
                </button>
              ))}
            </div>
          </div>

          <div className="choose-filter">
            {/* 필터 스타일 선택 */}
            <h3>Filter</h3>
            {[
              'Natural Daylight',
              'Neon Lighting',
              'Cold Lighting',
              'Rainbow Lighting',
            ].map((filter) => (
              <button
                key={filter}
                className={selectedOptions.filter === filter ? 'active' : ''}
                onClick={() => handleOptionChange('filter', filter)}
              >
                {filter}
              </button>
            ))}
          </div>
          <br />

          <div className="choose-size">
            <h3>Size</h3>
            <select
              onChange={(e) => handleDimensionChange(e.target.value)} // 드롭다운에서 선택하면 handleDimensionChange 호출
              style={{ marginLeft: '10px', padding: '5px' }}
            >
              <option value="square">정사각형 (512x512)</option>
              <option value="portrait">세로형 (512x880)</option>
              <option value="landscape">가로형 (880x512)</option>
            </select>
          </div>
          <br />
          <div className="choose-guidance">
            <h3>Guidance</h3>
            <p className="c-dic">
              프롬프트 충실도 단계가 높을수록 소요되는 시간이 증가됩니다.
            </p>
            {['low', 'normal', 'high'].map((guidance) => (
              <button
                key={guidance}
                className={
                  selectedOptions.guidance === guidance ? 'active' : ''
                }
                onClick={() => handleOptionChange('guidance', guidance)}
              >
                {guidance}
              </button>
            ))}
          </div>
          <br />
          <div className="chose-noise">
            <h3>Noise</h3>
            <p className="c-dic">
              노이즈 제거 단계가 높을수록 소요되는 시간이 증가됩니다.
            </p>
            {['low', 'normal', 'high'].map((noise) => (
              <button
                key={noise}
                className={selectedOptions.noise === noise ? 'active' : ''}
                onClick={() => handleOptionChange('noise', noise)}
              >
                {noise}
              </button>
            ))}
          </div>
        </div>
        <br />

        <div className="image-create-right">
          {/* 사용자 프롬프트 입력 */}
          <div className="user-prompts">
            <h3>Promt</h3>

            <textarea
              className=""
              placeholder="원하는 프롬프트를 입력해 나만의 캐릭터 이미지를 만들어보세요."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows="3"
              cols="50"
            />
          </div>

          <button
            onClick={handleGenerateImage}
            disabled={loading}
            style={{ marginTop: '10px' }}
          >
            {loading ? '생성 중...' : '이미지 생성'}
          </button>

          <div className="create-finished-area">
            <p>Generated Image:</p>
            {generatedImage && (
              <div className="finished-image" style={{ marginTop: '20px' }}>
                <img
                  src={generatedImage}
                  alt="생성된 이미지"
                  style={{ maxWidth: '100%', maxHeight: '400px' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCreate;
