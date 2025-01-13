// 이미지 생성 프롬프트 관리(개발자용)
// prompts.js

export const BASE_PROMPT =
  'face focus, masterpiece, best quality, upper body, close-up, looking at viewer, one person, detailed hair, high-quality hair, detailed eyes, lively eyes, Natural transition between the white of the eye and the iris, full face';

export const EXCLUDED_PROMPT =
  'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry';

export const STYLE_PROMPTS = {
  cute: 'cute image style',
  powerful:
    '3D style, Photorealistic, High detail, Cinematic quality, Depth and shadowing',
  retro: 'retro image style',
  cyberpunk: 'cyberpunk image style',
};

export const BACKGROUND_PROMPTS = {
  beach: 'sunny beach, ocean waves',
  starrySky: 'starry night sky, constellations',
  forest: 'dense forest, sunlight filtering through trees',
  castle: 'medieval castle, dramatic lighting',
};

export const FILTER_PROMPTS = {
  natural: 'natural lighting, balanced colors',
  neon: 'neon glow, vibrant colors',
  cold: 'cool tones, icy atmosphere',
  rainbow: 'bright rainbow hues, colorful lighting',
};
