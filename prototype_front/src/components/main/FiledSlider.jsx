import React from "react";
import { useNavigate } from "react-router-dom"; // React Router 사용
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./filedSlider.css";

import backgroundImage1 from "../../assets/School/banner01_1.png";
import backgroundImage2 from "../../assets/Wuxia/banner01_1.png";
import backgroundImage3 from "../../assets/Western/banner01_1.png";

import school001 from "../../assets/School/school001.png";

import wuxia001 from "../../assets/Wuxia/wuxia001.png";
import wuxia002 from "../../assets/Wuxia/wuxia002.png";
import wuxia003 from "../../assets/Wuxia/wuxia003.png";


import western001 from "../../assets/Western/western001.png";


const FiledSlider = () => {
  const navigate = useNavigate(); // 네비게이션 함수

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
  };

  const banners = [
    {
      title: "학교 / 아카데미",
      description: "파릇파릇한 청춘 이야기. \n학교/아카데미의 청춘 캐릭터들을 만나보세요!",
      backgroundImage: backgroundImage1,
      gradientColor: "rgba(196, 33, 33, 0.5)", // 배너의 그라데이션 색상 지정
      fieldId: 1, // 필드 ID
      characters: [
        { name: "최하영", image: school001 },
      ],
    },
    {
      title: "무협 세계",
      description: "묻노니, 협이란 무엇인가? \n협에대한 이야기를 캐릭터 친구들과 나눠보세요!",
      backgroundImage: backgroundImage2,
      gradientColor: "rgba(196, 33, 33, 0.5)", // 다른 배너의 그라데이션 색상
      fieldId: 4, // 필드 ID
      characters: [
        { name: "한채린", image: wuxia001 },
        { name: "청명", image: wuxia002 },
        { name: "강룡(고수)", image: wuxia003 },

      ],
    },
    {
      title: "서양",
      description: "서양 배경의 깐부 친구들을 만나보세요!",
      backgroundImage: backgroundImage3,
      gradientColor: "rgba(33, 150, 243, 0.5)", // 다른 배너의 그라데이션 색상
      fieldId: 8, // 필드 ID
      characters: [
        { name: "도널드 트럼프", image: western001 },
      ],
    },
  ];

  const handleMoreClick = (fieldId) => {
    navigate(`/fieldSearch?field=${fieldId}`); // 필드 ID를 포함한 URL로 이동
  };

  return (
    <div className="filed-slider">
      <Slider {...sliderSettings}>
        {banners.map((banner, index) => (
          <div key={index} className="slider-item">
            {/* 그라데이션 오버레이 */}
            <div
              className="gradient-overlay"
              style={{
                background: `linear-gradient(to right, ${banner.gradientColor}, transparent)`,
              }}
            ></div>

            {/* 배경 이미지 */}
            <div
              className="image-container"
              style={{
                backgroundImage: `url(${banner.backgroundImage})`,
              }}
            ></div>

            {/* 콘텐츠 */}
            <div className="banner-content">
              <div className="filed-text">
                <h2 className="filed-title">{banner.title}</h2>
                <p className="filed-description">{banner.description}</p>
              </div>

              <div className="filed-character-area">
                {banner.characters.map((character, idx) => (
                  <div key={idx} className="filed-character-card">
                    <img src={character.image} alt={character.name} />
                    <span>{character.name}</span>
                  </div>
                ))}
              </div>

              <div className="filed-button-area">
              <button
                  className="filed-more-button"
                  onClick={() => handleMoreClick(banner.fieldId)}
                >
                  더보기
                </button>
              </div>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default FiledSlider;