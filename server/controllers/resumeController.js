const cloudinary = require("../services/cloudinary");
const User = require("../models/UserSchema");

const parseCookies = (req) => {
  const raw = req.headers.cookie;
  if (!raw) return {};
  return raw.split(";").reduce((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
};

const uploadBufferToCloudinary = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      return resolve(result);
    });
    stream.end(buffer);
  });

const uploadResume = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "resume_missing" });
  }

  const cookies = parseCookies(req);
  const userId = cookies.session_user;

  let user;
  if (userId) {
    user = await User.findById(userId);
  }
  // DEV BYPASS: fall back to first user in DB when no session
  if (!user) {
    user = await User.findOne();
  }
  if (!user) {
    return res.status(401).json({ error: "no_users_in_db" });
  }

  try {
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "resumes",
      resource_type: "raw",
      public_id: `resume_${user._id}_${Date.now()}`,
    });

    user.resume = uploadResult.secure_url;
    await user.save();

    return res.status(200).json({ ok: true, resumeUrl: uploadResult.secure_url });
  } catch (error) {
    console.error("Cloudinary resume upload failed:", {
      message: error.message,
      code: error.code,
      http_code: error.http_code,
    });
    return res.status(502).json({ error: "resume_upload_failed" });
  }
};

module.exports = { uploadResume };
