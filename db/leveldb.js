// LevelDB 어댑터: 값은 AES-256-GCM으로 암호화해 저장합니다.

const path = require('path');
const { Transform } = require('stream');
const { Level } = require('level');
const { encryptJson, decryptJson } = require('./cryptoAtRest');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = new Level(path.join(__dirname, '../_data/leveldb'), { valueEncoding: 'utf8' });

function isNotFound(err) {
  return err && (err.code === 'LEVEL_NOT_FOUND' || err.notFound === true);
}

async function put(key, value) {
  const enc = encryptJson(value);
  return db.put(key, enc);
}

async function get(key) {
  const enc = await db.get(key);
  if (enc === undefined) return undefined;
  return decryptJson(enc);
}

async function del(key) {
  return db.del(key);
}

function createReadStream(options = {}) {
  const src = db.createReadStream({ ...options, valueEncoding: 'utf8' });
  const dec = new Transform({
    objectMode: true,
    transform(chunk, _enc, cb) {
      try {
        const next = { ...chunk, value: decryptJson(chunk.value) };
        cb(null, next);
      } catch (e) {
        cb(e);
      }
    },
  });
  return src.pipe(dec);
}

module.exports = { put, get, del, createReadStream, isNotFound };
