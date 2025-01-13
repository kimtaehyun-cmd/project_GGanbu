import React from 'react';
import './CharacterCard.css';

const CharacterCard = ({ card, index, onClick }) => {
  // console.log("card : ", card);
  return (
    <div key={index} className="cc-character-card" onClick={onClick}>
      <div className="cc-card-image-container">
        <img
          src={card.character_image}
          alt={card.char_name}
          className="cc-character-image"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/default-avatar.png';
          }}
        />
      </div>
      <div className="cc-character-info">
        <h2 className="cc-character-name">{card.char_name}</h2>
        <p className="cc-character-description">{card.char_description}</p>
      </div>
    </div>
  );
};

export default CharacterCard;
