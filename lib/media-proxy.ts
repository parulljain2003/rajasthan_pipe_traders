/** Base URL of the Express API that implements /api/media (Cloudinary). No trailing slash. */
export function getMediaApiBase(): string | null {
  const u = process.env.MEDIA_API_URL?.trim();
  if (!u) return null;
  return u.replace(/\/$/, "");
}
