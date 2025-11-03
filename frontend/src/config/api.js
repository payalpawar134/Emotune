const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/auth/login`,
  REGISTER: `${API_BASE_URL}/auth/register`,
  LOGOUT: `${API_BASE_URL}/auth/logout`,
  VERIFY: `${API_BASE_URL}/auth/verify`,

  // Emotion
  DETECT_IMAGE: `${API_BASE_URL}/emotion/detect-image`,
  DETECT_WEBCAM: `${API_BASE_URL}/emotion/detect-webcam`,
  EMOTION_HISTORY: `${API_BASE_URL}/emotion/history`,
  EMOTION_STATS: `${API_BASE_URL}/emotion/stats`,

  // Music
  RECOMMEND_MUSIC: `${API_BASE_URL}/music/recommend`,
  MUSIC_HISTORY: `${API_BASE_URL}/music/history`,
  RECOMMEND_WITH_PREVIEW: `${API_BASE_URL}/music/recommend-with-preview`,

  // Profile
  PROFILE: `${API_BASE_URL}/profile`,
  UPDATE_PROFILE: `${API_BASE_URL}/profile/update`,
  CHANGE_PASSWORD: `${API_BASE_URL}/profile/change-password`,
  USER_ACTIVITY: `${API_BASE_URL}/profile/activity`,
};

export default API_BASE_URL;
