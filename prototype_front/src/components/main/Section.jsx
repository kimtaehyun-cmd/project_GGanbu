import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import './Section.css';
import CharacterCard from './CharacterCard';
import CharacterModal from './CharacterModal';

function SectionField({
  title,
  categories,
  cards,
  onCategoryClick,
  selectedCategories,
  onCardClick,
  keyType,
}) {
  const scrollContainerRef = useRef(null);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);

  const handleScroll = (direction) => {
    const container = scrollContainerRef.current;
    const scrollAmount = container.offsetWidth - 100;
    container.scrollTo({
      left:
        container.scrollLeft +
        (direction === 'right' ? scrollAmount : -scrollAmount),
      behavior: 'smooth',
    });
  };

  const checkScrollPosition = () => {
    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const maxScrollLeft = container.scrollWidth - container.clientWidth;

    setIsAtStart(scrollLeft <= 0);
    setIsAtEnd(scrollLeft >= maxScrollLeft);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    container.addEventListener('scroll', checkScrollPosition);

    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
    };
  }, []);

  return (
    <div className="section">
      <h1 className="section-title">{title}</h1>
      <div className="categories">
        {Array.isArray(categories) && categories.map((category, index) => (
          <button
            key={`${category[keyType]}-${index}`} // keyType에 따라 key 지정
            className={`category-btn ${
              selectedCategories.includes(category[keyType]) ? 'selected' : ''
            }`}
            onClick={() => onCategoryClick(category)}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div
        className={`cards-container ${isAtStart ? 'is-at-start' : ''} ${
          isAtEnd ? 'is-at-end' : ''
        }`}
      >
        <div className="scroll-controls">
          {!isAtStart && (
            <button
              className="scroll-button left"
              onClick={() => handleScroll('left')}
            >
              ←
            </button>
          )}
          <div className="character-cards" ref={scrollContainerRef}>
            {cards.length > 0 ? (
              cards.map((card, index) => (
                <CharacterCard
                  card={card}
                  index={index}
                  key={`card-${card.char_idx}-${index}`}
                  onClick={() => onCardClick(card)}
                />
              ))
            ) : (
              <p className="no-results">검색된 내용이 없습니다.</p>
            )}
          </div>
          {!isAtEnd && (
            <button
              className="scroll-button right"
              onClick={() => handleScroll('right')}
            >
              →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const Section = () => {
  const [allCharacters, setAllCharacters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tags, setTags] = useState([]);
  const [fieldCategories, setFieldCategories] = useState([]);

  const [fieldFilters, setFieldFilters] = useState([]);
  const [tagFilters, setTagFilters] = useState([]);
  const [fieldLimit, setFieldLimit] = useState(18);
  const [tagLimit, setTagLimit] = useState(18);
  const [createdLimit, setCreatedLimit] = useState(18);

  const [selectedCharacter, setSelectedCharacter] = useState(null);

  // 초기 데이터 로드
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [charactersResponse, tagsResponse, fieldsResponse] =
          await Promise.all([
            axios.get(`${process.env.REACT_APP_SERVER_DOMAIN}/api/characters/`),
            axios.get(`${process.env.REACT_APP_SERVER_DOMAIN}/api/tags`),
            axios.get(`${process.env.REACT_APP_SERVER_DOMAIN}/api/fields`),
          ]);

        // console.log('Fetched Characters:', charactersResponse.data); // 캐릭터 데이터 로그
        // console.log('Fetched Tags:', tagsResponse.data); // 태그 데이터 로그
        // console.log('Fetched Fields:', fieldsResponse.data); // 필드 데이터 로그

        setAllCharacters(charactersResponse.data); // 캐릭터 리스트 설정
        setTags(tagsResponse.data); // 태그 리스트 설정
        setFieldCategories(fieldsResponse.data); // 필드 리스트 설정
        setIsLoading(false); // 로딩 완료
      } catch (error) {
        console.error('데이터 로드 오류:', error);
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    // console.log('Fetched Characters:', allCharacters);
  }, [allCharacters]);

  // 필터링된 결과 계산
  const fieldBasedCards = useMemo(() => {
    let filtered = [...allCharacters];
    if (fieldFilters.length > 0) {
      filtered = filtered.filter((char) =>
        fieldFilters.includes(char.field_idx)
      );
    }

    filtered.sort((a, b) => b.follower_count - a.follower_count);

    return filtered.slice(0, fieldLimit);
  }, [allCharacters, fieldFilters, fieldLimit]);

  const tagBasedCards = useMemo(() => {
    let filtered = [...allCharacters];
    if (tagFilters.length > 0) {
      filtered = filtered.filter(
        (char) =>
          char.tags && char.tags.some((tag) => tagFilters.includes(tag.tag_idx))
      );
    }

    return filtered.slice(0, tagLimit);
  }, [allCharacters, tagFilters, tagLimit]);

  const createdBasedCards = useMemo(() => {
    return [...allCharacters]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, createdLimit);
  }, [allCharacters, createdLimit]);

  // 이벤트 핸들러
  const handleFieldClick = (category) => {
    console.log('Clicked Category:', category);

    if (category.field_idx === -1) {
      setFieldFilters([]);
      setFieldLimit(18); // 변경: 12에서 18로 증가
      console.log('Field Filter Reset!');
    } else {
      // 필터 토글
      setFieldFilters((prev) => {
        const updatedFilters = prev.includes(category.field_idx)
          ? prev.filter((id) => id !== category.field_idx)
          : [...prev, category.field_idx];
        console.log('Updated Field Filters:', updatedFilters);
        return updatedFilters;
      });
    }
  };

  const handleTagClick = (category) => {
    if (category.tag_idx === -1) {
      setTagFilters([]);
    } else {
      setTagFilters((prev) =>
        prev.includes(category.tag_idx)
          ? prev.filter((tag) => tag !== category.tag_idx)
          : [...prev, category.tag_idx]
      );
    }
  };

  const handleCreatedClick = (category) => {
    if (category.field_idx === -1) {
      setCreatedLimit(18); // 변경: 12에서 18로 증가
    }
  };

  const sectionData = [
    {
      title: '필드 기반 추천',
      categories: fieldCategories.map((field) => ({
        name: field.field_category,
        field_idx: field.field_idx,
      })),
      cards: fieldBasedCards,
      onCategoryClick: handleFieldClick,
      selectedCategories: fieldFilters,
      onCardClick: setSelectedCharacter,
      keyType: 'field_idx',
    },
    {
      title: '태그 기반 추천',
      categories: tags.map((tag) => ({
        name: tag.tag_name,
        tag_idx: tag.tag_idx,
      })),
      cards: tagBasedCards,
      onCategoryClick: handleTagClick,
      selectedCategories: tagFilters,
      onCardClick: setSelectedCharacter,
      keyType: 'tag_idx',
    },
    {
      title: '새로 나온 캐릭터',
      categories: [],
      cards: createdBasedCards,
      onCategoryClick: handleCreatedClick,
      selectedCategories: [],
      onCardClick: setSelectedCharacter,
    },
  ];

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      {sectionData.map((section, index) => (
        <SectionField
          key={index}
          title={section.title}
          categories={section.categories || []}
          cards={section.cards || []}
          onCategoryClick={section.onCategoryClick}
          selectedCategories={section.selectedCategories}
          onCardClick={section.onCardClick}
          keyType={section.keyType}
        />
      ))}

      {selectedCharacter && (
        <CharacterModal
          character={selectedCharacter}
          onClose={() => setSelectedCharacter(null)}
        />
      )}
    </div>
  );
};

export default Section;
