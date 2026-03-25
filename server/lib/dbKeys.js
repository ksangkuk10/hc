const db = require('../../db');

/** missing key → null (Level은 없으면 NotFoundError). */
async function getKey(key) {
  try {
    const v = await db.get(key);
    return v === undefined ? null : v;
  } catch (e) {
    if (db.isNotFound && db.isNotFound(e)) return null;
    if (e && (e.code === 'LEVEL_NOT_FOUND' || e.notFound === true)) return null;
    throw e;
  }
}

module.exports = { getKey };
