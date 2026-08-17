const path = require('path');
const fs = require('fs');

const downloadDir = path.join(__dirname, '../../../download');

/** Returns every .zip in the download folder with size/mtime meta. */
function listFiles() {
  if (!fs.existsSync(downloadDir)) return [];
  return fs
    .readdirSync(downloadDir)
    .filter((f) => f.toLowerCase().endsWith('.zip'))
    .map((f) => {
      const stat = fs.statSync(path.join(downloadDir, f));
      return { name: f, size: stat.size, mtimeMs: stat.mtimeMs, mtime: stat.mtime };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

/** Returns the file the public /download route serves (most recently uploaded). */
function currentFile() {
  const files = listFiles();
  return files.length > 0 ? files[0] : null;
}

/** Copies an uploaded file (multer) into the download folder. */
function saveUploadedZip(file) {
  if (!file) throw new Error('No file provided.');
  const name = path.basename(file.originalname || 'download.zip');
  const dest = path.join(downloadDir, name);
  fs.mkdirSync(downloadDir, { recursive: true });
  fs.copyFileSync(file.path, dest);
  fs.unlinkSync(file.path); // clear multer temp file
  return listFiles().find((f) => f.name === name);
}

/** Deletes a zip by name. Only accepts plain .zip filenames (no paths). */
function deleteZip(name) {
  const safe = path.basename(name || '');
  if (!safe.toLowerCase().endsWith('.zip')) return false;
  const target = path.join(downloadDir, safe);
  if (!fs.existsSync(target)) return false;
  fs.unlinkSync(target);
  return true;
}

module.exports = { listFiles, currentFile, saveUploadedZip, deleteZip };