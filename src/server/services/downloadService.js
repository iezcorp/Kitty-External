const prisma = require('../../database/prisma');

/**
 * Download files are stored in the database (BLOB/bytea) instead of the
 * filesystem so they persist in production: Vercel's filesystem is ephemeral,
 * and SQLite local dev / Postgres production both support binary columns.
 */

/** Returns every uploaded download, newest first (no binary payloads). */
function listFiles() {
  return prisma.file.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, size: true, createdAt: true },
  });
}

/** Returns the file the public /download route serves (most recent upload). */
function currentFile() {
  return prisma.file.findFirst({ orderBy: { createdAt: 'desc' } });
}

/**
 * Stores an uploaded file (multer memory upload: { originalname, buffer }).
 * Re-uploading a file with the same name replaces the previous version.
 */
async function saveUploadedZip(file) {
  if (!file || !file.buffer) throw new Error('No file provided.');
  const name = (file.originalname || 'download.zip').trim();
  const size = file.buffer.length;

  const existing = await prisma.file.findUnique({ where: { name } });
  if (existing) {
    return prisma.file.update({ where: { name }, data: { size, data: file.buffer } });
  }
  return prisma.file.create({ data: { name, size, data: file.buffer } });
}

/** Deletes an uploaded file by name. */
async function deleteZip(name) {
  const result = await prisma.file.deleteMany({ where: { name: name || '' } });
  return result.count > 0;
}

module.exports = { listFiles, currentFile, saveUploadedZip, deleteZip };