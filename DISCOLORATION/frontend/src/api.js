// simple axios wrapper
import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // important to send/receive the auth cookie
});

export default api;
