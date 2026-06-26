import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
          username: email,
          password,
        });

        const { access_token } = response.data;
        localStorage.setItem('opto_auth_token', access_token);
        localStorage.removeItem('opto_2fa_temp_token');

        // Fetch complete user profile data using the access token
        const userResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });

        set({
          token: access_token,
          user: userResponse.data,
          isAuthenticated: true,
        });

        return userResponse.data;
      },

      register: async (email, password, companyName) => {
        const response = await axios.post(`${BASE_URL}/api/auth/register`, {
          email,
          username: email,
          password,
          company_name: companyName,
        });

        const { access_token } = response.data;
        localStorage.setItem('opto_auth_token', access_token);
        localStorage.removeItem('opto_2fa_temp_token');

        // Fetch user profile to verify registration and populate store state
        const userResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });

        set({
          token: access_token,
          user: userResponse.data,
          isAuthenticated: true,
        });

        return userResponse.data;
      },

      logout: async () => {
        const { token } = get();
        if (token) {
          try {
            await axios.post(
              `${BASE_URL}/api/auth/logout`,
              {},
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
          } catch (error) {
            console.error('Logout error on backend:', error);
          }
        }
        localStorage.removeItem('opto_auth_token');
        localStorage.removeItem('opto_2fa_temp_token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'opto-auth-store', // Key name in localStorage
    }
  )
);
