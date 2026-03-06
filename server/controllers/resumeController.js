const cloudinary = require("../services/cloudinary");
const User = require("../models/UserSchema");

const PYTHON_URL = process.env.PYTHON_URL || "https://senate-rag.onrender.com";

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
  if (!userId) {
    return res.status(401).json({ error: "unauthorized_session" });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(401).json({ error: "user_not_found" });
  }

  try {
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "resumes",
      resource_type: "raw",
      public_id: `resume_${user._id}_${Date.now()}`,
    });

    user.resume = uploadResult.secure_url;
    await user.save();
    await sendToVectorDB(uploadResult.secure_url, user._id.toString());
    return res.status(200).json({ ok: true, resumeUrl: uploadResult.secure_url });
  } catch (error) {
    console.error("Resume pipeline failed:", {
      message: error.message,
      code: error.code,
      http_code: error.http_code,
    });
    const errorCode = String(error?.message || "").includes("vector_db")
      ? "resume_ingestion_failed"
      : "resume_upload_failed";
    return res.status(502).json({ error: errorCode });
  }
};

const sendToVectorDB = async (resumeUrl, userId) => {
  console.log("Sending to vector db");
  try{
    const response = await fetch(`${PYTHON_URL}/ingest-resume`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ resumeUrl, userId })
    });
    console.log("Sending data: ", JSON.stringify({ resumeUrl, userId }));

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      throw new Error(`vector_db_http_${response.status}: ${responseText}`);
    }

    const data = await response.json();
    if (data.status !== "ok") {
      throw new Error(`vector_db_invalid_response: ${JSON.stringify(data)}`);
    }
    console.log("Successfully sent resume to vector db");
  } catch (error) {
    console.error("Failed to send resume to vector db:", error);
    throw new Error(`vector_db_failure: ${error.message}`);
  }
};
module.exports = { uploadResume };
