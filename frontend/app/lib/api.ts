import axios from 'axios';


const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://task-management-system-xe25.onrender.com/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add timeout
  timeout: 10000,
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('Making request to:', config.url);
    
    console.log('Method:', config.method);
    console.log('Data:', config.data);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('Response received:', response.status);
    return response;
  },
  (error) => {
    console.error('Response error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers,
      url: error.config?.url
    });
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (userData:any) => {
    try {
      const response = await api.post('/auth/register', userData);
      console.log('Registration success:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Registration API error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      
      // Return error in consistent format
      if (error.response?.data) {
        throw error.response.data;
      }
      throw { 
        success: false, 
        message: error.message || 'Network error' 
      };
    }
  },

  login: async (credentials:any) => {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error: any) {
      console.error('Login API error:', error.response?.data || error.message);
      if (error.response?.data) {
        throw error.response.data;
      }
      throw { 
        success: false, 
        message: error.message || 'Network error' 
      };
    }
  },
};

export default api;