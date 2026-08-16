import adminConfig from '../config/adminConfig';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

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
      const querySnapshot = await getDocs(collection(db, "feedback"));
      const feedbacks = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        feedbacks.push({
          _id: doc.id,
          ...data,
          submitted_at: data.submitted_at?.toDate ? data.submitted_at.toDate().toISOString() : data.submitted_at
        });
      });
      return feedbacks;
    } catch (error) {
      console.error("Failed to fetch feedback data from Firestore:", error);
      return [];
    }
  }
};

export default adminApi;
