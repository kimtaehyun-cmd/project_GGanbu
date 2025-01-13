export const getUserIdxFromToken = () => {
  const token = localStorage.getItem('authToken'); // 또는 쿠키에서 가져올 수 있습니다.
  if (!token) return null;

  try {
    const base64Url = token.split('.')[1]; // 토큰의 payload 부분
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/'); // Base64 URL 인코딩을 디코딩할 수 있도록 변환
    const decoded = JSON.parse(atob(base64)); // Base64 디코딩 후 JSON으로 변환
    return decoded.user_idx; // payload에서 user_idx 추출
  } catch (error) {
    console.error('토큰 디코딩 오류:', error);
    return null;
  }
};
