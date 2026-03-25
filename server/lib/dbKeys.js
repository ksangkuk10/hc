const db = require('../../db');

/** Level/abstract-level: missing key → undefined (no throw). */
async function getKey(key) {
  const v = await db.get(key);
  return v === undefined ? null : v;
}

module.exports = { getKey };
