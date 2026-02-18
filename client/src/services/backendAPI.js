import axios from "axios";

export const server = await axios.create({
  baseURL: "http://localhost:3000",
  withCredentials: true,
});