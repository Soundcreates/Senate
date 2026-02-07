
const BASE_API = "http://localhost:3000";

export const startGithubLogin = (manualEmail, redirectTo) => {
  console.log("OAuth for GitHub started");
  const url = new URL(`${BASE_API}/api/oauth/github`);
  if (manualEmail) {
    url.searchParams.set("manualEmail", manualEmail);
  }
  if (redirectTo) {
    url.searchParams.set("redirectTo", redirectTo);
  }
  window.location.assign(url.toString());
};