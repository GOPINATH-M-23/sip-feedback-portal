import adminConfig from '../config/adminConfig';

export const adminApi = {
  login: (password) => {
    if (password === adminConfig.ADMIN_PASSWORD) {
      sessionStorage.setItem('isAdmin', 'true');
      localStorage.setItem('isAdmin', 'true');
      return true;
    }
    return false;
  },

  logout: () => {
    sessionStorage.removeItem('isAdmin');
    localStorage.removeItem('isAdmin');
  },

  isAdmin: () => {
    return sessionStorage.getItem('isAdmin') === 'true' || localStorage.getItem('isAdmin') === 'true';
  },

  getFeedback: async () => {
    try {
      // First try relative /api/feedback (uses Vite proxy or domain proxy)
      let response;
      try {
        response = await fetch('/api/feedback');
        if (!response.ok) throw new Error('Relative fetch failed');
      } catch (err) {
        // Fallback to direct absolute URL
        response = await fetch(`${adminConfig.API_BASE_URL}/api/feedback`);
      }

      if (!response.ok) {
        throw new Error(`Network response error: ${response.statusText}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Failed to fetch feedback data:", error);
      return [];
    }
  }
};

export default adminApi;
