// LevelDB 어댑터: 값은 AES-256-GCM으로 암호화해 저장합니다.

const fs = require('fs');
const path = require('path');
const { Transform } = require('stream');
const { Level } = require('level');
const { encryptJson, decryptJson } = require('./cryptoAtRest');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbDir = path.join(__dirname, '../_data/leveldb');
fs.mkdirSync(dbDir, { recursive: true });

function createLevelDb() {
  return new Level(dbDir, { valueEncoding: 'utf8' });
}

let db = createLevelDb();

function isRecoverableOpenError(e) {
  if (!e) return false;
  if (e.code === 'LEVEL_DATABASE_NOT_OPEN') return true;
  const c = e.cause;
  if (c && c.code === 'LEVEL_IO_ERROR') return true;
  return false;
}

/**
 * HTTP 서버가 요청을 받기 전에 한 번 호출합니다.
 * 저장소가 손상·불완전하면 `_data/leveldb`를 비우고 한 번 재생성합니다.
 */
async function openDatabase() {
  try {
    await db.open();
  } catch (e) {
    if (!isRecoverableOpenError(e)) throw e;
    console.warn(
      '[db] LevelDB 열기 실패(손상·불완전 가능). 저장소를 초기화한 뒤 다시 엽니다.',
      e.cause?.message || e.message,
    );
    try {
      await db.close();
    } catch {
      /* */
    }
    try {
      fs.rmSync(dbDir, { recursive: true, force: true });
    } catch {
      /* */
    }
    fs.mkdirSync(dbDir, { recursive: true });
    db = createLevelDb();
    await db.open();
  }
}

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

module.exports = { put, get, del, createReadStream, isNotFound, openDatabase };
