import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || "https://senate-qiog.onrender.com";


// Configure axios to include credentials
const axiosConfig = {
  withCredentials: true,
};

// Calculate payment for a user on a task
export const calculatePayment = async (taskId, userId) => {
  const response = await axios.post(`${API_URL}/api/payments/calculate/${taskId}`, { userId }, axiosConfig);
  return response.data;
};

// Process fiat payment
export const processFiatPayment = async (paymentData) => {
  const response = await axios.post(`${API_URL}/api/payments/fiat`, paymentData, axiosConfig);
  return response.data;
};

// Process crypto payment via escrow
export const processCryptoPayment = async (paymentData) => {
  const response = await axios.post(`${API_URL}/api/payments/crypto`, paymentData, axiosConfig);
  return response.data;
};

// Finalize milestone
export const finalizeMilestone = async (projectId, milestoneId) => {
  const response = await axios.post(`${API_URL}/api/payments/finalize-milestone`, { projectId, milestoneId }, axiosConfig);
  return response.data;
};

// Get all payments for a task
export const getTaskPayments = async (taskId) => {
  const response = await axios.get(`${API_URL}/api/payments/task/${taskId}`, axiosConfig);
  return response.data;
};

// Get all payments for a user
export const getUserPayments = async (userId) => {
  const response = await axios.get(`${API_URL}/api/payments/user/${userId}`, axiosConfig);
  return response.data;
};
