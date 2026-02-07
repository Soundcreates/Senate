const express = require("express");
const OAuthRouter = express.Router();
const { HandleWakaTimeOAuth, HandleGithubOAuth, getSessionUser } = require("../controllers/oauthController");

OAuthRouter.get("/wakatime", HandleWakaTimeOAuth);
OAuthRouter.get("/wakatime-redirect", HandleWakaTimeOAuth);
OAuthRouter.get("/github", HandleGithubOAuth);
OAuthRouter.get("/github-redirect", HandleGithubOAuth);
OAuthRouter.get("/session", getSessionUser);

module.exports = OAuthRouter;