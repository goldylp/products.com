const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { UPLOADS_DIR } = require('../config/constants');

const IMAGE_MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

const sanitizeFilename = (value = 'image') => (
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'image'
);

const saveBase64Image = (imageData, { folder = 'misc', fileName = 'image' } = {}) => {
  const match = imageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image data');
  }

  const [, mimeType, base64Payload] = match;
  const extension = IMAGE_MIME_EXTENSIONS[mimeType];
  if (!extension) {
    throw new Error('Only JPG, PNG, WEBP and GIF images are supported');
  }

  const buffer = Buffer.from(base64Payload, 'base64');
  if (!buffer.length) {
    throw new Error('Image file is empty');
  }

  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error('Image must be smaller than 5MB');
  }

  const safeFolder = sanitizeFilename(folder);
  const safeFileName = sanitizeFilename(fileName.replace(/\.[^/.]+$/, ''));
  const targetDir = path.join(UPLOADS_DIR, safeFolder);
  fs.mkdirSync(targetDir, { recursive: true });

  const storedFileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${safeFileName}.${extension}`;
  fs.writeFileSync(path.join(targetDir, storedFileName), buffer);

  return `/uploads/${safeFolder}/${storedFileName}`;
};

module.exports = {
  saveBase64Image
};
