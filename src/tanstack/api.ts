// axiosInstance.ts
import axios from "axios";

export const apiClient = axios.create({ baseURL: "/api" });

apiClient.interceptors.response.use(
  (response) => {
    // if success=false, throw custom error
    if (response.data && response.data.success === false) {
      return Promise.reject(new Error(response.data.error || "Unknown error"));
    }
    return response;
  },
  (error) => {
    const message =
      error.response?.data?.error || error.message || "An error occurred";
    return Promise.reject(new Error(message));
  },
);
