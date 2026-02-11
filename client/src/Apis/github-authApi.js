
const BASE_API = "https://senate-qiog.onrender.com"


export const startGithubLogin = (manualEmail, redirectTo, role) => {
  console.log("OAuth for GitHub started");
  const url = new URL(`${BASE_API}/api/oauth/github`);
  if (manualEmail) {
    url.searchParams.set("manualEmail", manualEmail);
  }
  if (redirectTo) {
    url.searchParams.set("redirectTo", redirectTo);
  }
  if (role) {
    url.searchParams.set("role", role);
  }
  window.location.assign(url.toString());
};