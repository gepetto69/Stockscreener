// Centralized API configuration supporting both relative /api and external backend URLs (VITE_API_URL)
export const API_BASE = import.meta.env.VITE_API_URL || '/api';
