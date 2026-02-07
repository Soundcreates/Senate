const express = require("express");
const {
	registerAdmin,
	registerDeveloper,
	loginAdmin,
	loginDeveloper,
	getAdminProfile,
	logoutAdmin,
	logoutDeveloper,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.get("/me", getAdminProfile);
router.post("/logout", logoutAdmin);

router.post("/developer/register", registerDeveloper);
router.post("/developer/login", loginDeveloper);
router.post("/developer/logout", logoutDeveloper);

module.exports = router;
