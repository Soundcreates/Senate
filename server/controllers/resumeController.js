const cloudinary = require("../services/cloudinary");
const { getSessionUserFromRequest } = require("../utils/sessionAuth");

const getPythonUrl = () => process.env.PYTHON_URL;

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

  const user = await getSessionUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: "unauthorized_session" });
  }

  let uploadResult;
  try {
    uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "resumes",
      resource_type: "raw",
      public_id: `resume_${user._id}_${Date.now()}`,
    });
  } catch (error) {
    console.error("Resume upload failed:", {
      message: error.message,
      code: error.code,
      http_code: error.http_code,
    });
    return res.status(502).json({ error: "resume_upload_failed" });
  }

  let ingestedSuccess = false;
  try {
    await sendToVectorDB(uploadResult.secure_url, user._id.toString());
    ingestedSuccess = true;
  } catch (error) {
    console.error("Resume ingestion failed; keeping uploaded resume:", {
      message: error.message,
    });
  }

  user.resume = uploadResult.secure_url;
  user.ingestedSuccess = ingestedSuccess;
  await user.save();

  return res.status(200).json({
    ok: true,
    resumeUrl: uploadResult.secure_url,
    ingestedSuccess,
  });
};

const sendToVectorDB = async (resumeUrl, userId) => {
  console.log("Sending to vector db");
  const PYTHON_URL = getPythonUrl();
  if (!PYTHON_URL) {
    throw new Error("PYTHON_URL is not set.");
  }
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
