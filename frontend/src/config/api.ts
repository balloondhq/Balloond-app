/**
 * API Configuration
 * Centralized API endpoint configuration
 */

const ENV = process.env.NODE_ENV || 'development';

const config = {
  development: {
    API_URL: 'http://localhost:3000/api',
    WS_URL: 'ws://localhost:3000',
  },
  production: {
    API_URL: 'https://api.balloond.com/api',
    WS_URL: 'wss://api.balloond.com',
  },
};

export const API_CONFIG = config[ENV as keyof typeof config] || config.development;

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  REFRESH: '/auth/refresh',
  PROFILE: '/auth/profile',
  
  // Users
  UPDATE_PROFILE: '/users/profile',
  UPDATE_LOCATION: '/users/location',
  UPLOAD_PHOTOS: '/users/photos',
  NEARBY_USERS: '/users/nearby',
  GET_USER: '/users',
  
  // Matching
  GET_BALLOONS: '/matching/balloons',
  POP_BALLOON: '/matching/pop',
  GET_MATCHES: '/matching/matches',
  GET_ALLOCATION: '/matching/allocation',
  
  // Chat
  GET_CONVERSATIONS: '/chat/conversations',
  GET_MESSAGES: '/chat/conversations',
  SEND_MESSAGE: '/chat/conversations',
  MARK_READ: '/chat/conversations',
  
  // Location
  UPDATE_LOCATION_SERVICE: '/location/update',
  GET_NEARBY: '/location/nearby',
  GET_DISTANCE: '/location/distance',
};

export const BALLOON_LIMITS = {
  FREE_DAILY: 10,
  PREMIUM_DAILY: -1, // Unlimited
};

export const RADIUS_OPTIONS = {
  MIN: 5,
  MAX: 100,
  DEFAULT: 50,
};
