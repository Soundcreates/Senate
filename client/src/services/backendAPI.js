import axios from "axios";
import { API_BASE_URL } from "../config/apiBase";


export const server = await axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});
