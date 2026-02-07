const BASE_API = "http://localhost:3000";

export const uploadResume = async (file) => {
  const formData = new FormData();
  formData.append("resume", file);

  const response = await fetch(`${BASE_API}/api/resume/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error || "resume_upload_failed" };
  }

  const data = await response.json();
  return { ok: true, resumeUrl: data.resumeUrl };
};
