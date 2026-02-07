
const BASE_API = "http://localhost:3000";

export const startGithubLogin = () => {
  console.log("OAuth for GitHub started");
  window.location.assign(`${BASE_API}/api/oauth/github`);
};