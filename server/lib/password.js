const crypto = require('crypto');

const PBKDF2_ITER = 120000;
const SALT_LEN = 16;
const KEY_LEN = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LEN);
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITER, KEY_LEN, 'sha512');
  return Buffer.concat([salt, hash]).toString('base64');
}

function verifyPassword(password, stored) {
  const buf = Buffer.from(stored, 'base64');
  const salt = buf.subarray(0, SALT_LEN);
  const expected = buf.subarray(SALT_LEN);
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITER, KEY_LEN, 'sha512');
  return crypto.timingSafeEqual(hash, expected);
}

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { hashPassword, verifyPassword, randomToken };
