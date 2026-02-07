const express = require("express");
const OAuthRouter = express.Router();
const { HandleWakaTimeOAuth, HandleGithubOAuth, getSessionUser, logoutUser } = require("../controllers/oauthController");

OAuthRouter.get("/wakatime", HandleWakaTimeOAuth);
OAuthRouter.get("/wakatime-redirect", HandleWakaTimeOAuth);
OAuthRouter.get("/github", HandleGithubOAuth);
OAuthRouter.get("/github-redirect", HandleGithubOAuth);
OAuthRouter.get("/session", getSessionUser);
OAuthRouter.post("/logout", logoutUser);

module.exports = OAuthRouter;