const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// Returns a user-facing error message, or null if the file is valid.
// Mirrors the checks the backend re-applies via Multer, so a rejected
// file never reaches the network in the first place.
export function validateImageFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Please upload a JPG, PNG or WEBP image.';
  }
  if (file.size > MAX_SIZE_BYTES) {
    return 'Image must be smaller than 5 MB.';
  }
  return null;
}

export function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
