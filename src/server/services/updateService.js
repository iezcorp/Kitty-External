const prisma = require('../../database/prisma');
const { broadcast } = require('./sseService');

function serialize(update) {
  return {
    ...update,
    changes: safeParseChanges(update.changes),
  };
}

function safeParseChanges(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function listPublished() {
  const updates = await prisma.update.findMany({
    where: { published: true },
    orderBy: { publishedAt: 'desc' },
  });
  return updates.map(serialize);
}

async function listAll() {
  const updates = await prisma.update.findMany({ orderBy: { createdAt: 'desc' } });
  return updates.map(serialize);
}

async function getById(id, { publicOnly = false } = {}) {
  const update = await prisma.update.findUnique({ where: { id } });
  if (!update) return null;
  if (publicOnly && !update.published) return null;
  return serialize(update);
}

async function create(data) {
  const update = await prisma.update.create({
    data: {
      title: data.title,
      version: data.version,
      robloxVersion: data.robloxVersion || null,
      shortDescription: data.shortDescription,
      description: data.description,
      changes: JSON.stringify(data.changes || []),
      imageUrl: data.imageUrl || null,
      published: false,
    },
  });
  return serialize(update);
}

async function update(id, data) {
  const existing = await prisma.update.findUnique({ where: { id } });
  if (!existing) return null;

  const updated = await prisma.update.update({
    where: { id },
    data: {
      title: data.title,
      version: data.version,
      robloxVersion: data.robloxVersion || null,
      shortDescription: data.shortDescription,
      description: data.description,
      changes: JSON.stringify(data.changes || []),
      imageUrl: data.imageUrl || null,
    },
  });

  const serialized = serialize(updated);

  // If it was already published, broadcast the edit to connected clients too.
  if (updated.published) {
    broadcast('update:edited', serialized);
  }

  return serialized;
}

async function remove(id) {
  const existing = await prisma.update.findUnique({ where: { id } });
  if (!existing) return null;
  await prisma.update.delete({ where: { id } });
  if (existing.published) {
    broadcast('update:deleted', { id });
  }
  return true;
}

async function publish(id) {
  const existing = await prisma.update.findUnique({ where: { id } });
  if (!existing) return null;

  const updated = await prisma.update.update({
    where: { id },
    data: { published: true, publishedAt: new Date() },
  });

  const serialized = serialize(updated);
  broadcast('update:published', serialized);
  return serialized;
}

async function unpublish(id) {
  const existing = await prisma.update.findUnique({ where: { id } });
  if (!existing) return null;

  const updated = await prisma.update.update({
    where: { id },
    data: { published: false },
  });

  broadcast('update:unpublished', { id });
  return serialize(updated);
}

module.exports = {
  listPublished,
  listAll,
  getById,
  create,
  update,
  remove,
  publish,
  unpublish,
};
