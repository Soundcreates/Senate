const express = require("express");
const { registerAdmin, loginAdmin, getAdminProfile, logoutAdmin } = require("../controllers/authController");

const router = express.Router();

router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.get("/me", getAdminProfile);
router.post("/logout", logoutAdmin);

module.exports = router;
