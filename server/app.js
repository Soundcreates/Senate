const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const dns = require("node:dns");
dotenv.config();

// Avoid undici fetch timeouts in environments with flaky IPv6.
dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const allowedOrigins = ["http://localhost:5173"];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

app.get("/health", (_req, res) => {
	res.status(200).json({ status: "ok" });
});
app.use("/api", require("./routes"));
app.use((req, res) => {
	res.status(404).json({ error: "Not Found", path: req.originalUrl });
});

app.use((err, _req, res, _next) => {
	// Basic error handler to avoid leaking internals.
	res.status(err.status || 500).json({ error: err.message || "Server error" });
});

if (!MONGO_URI) {
	console.error("MONGO_URI is not set.");
	process.exit(1);
}

mongoose
	.connect(MONGO_URI)
	.then(() => {
		console.log("MongoDB connected.");
		app.listen(PORT, () => {
			console.log(`Server listening on ${PORT}`);
		});
	})
	.catch((error) => {
		console.error("MongoDB connection error:", error);
		process.exit(1);
	});
