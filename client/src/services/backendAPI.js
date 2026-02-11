import axios from "axios";

export const server = await axios.create({
  baseURL: "https://senate-qiog.onrender.com",
  withCredentials: true,
});