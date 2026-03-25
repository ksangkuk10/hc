/**
 * LevelDB 값 전용 암호화 (AES-256-GCM). 키는 HC_LEVELDB_KEY(.env, 64 hex = 32 bytes).
 */
const crypto = require('crypto');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ALGO = 'aes-256-gcm';
const VERSION = 1;
const IV_LEN = 12;
const TAG_LEN = 16;

function getKeyBuffer() {
  const hex = process.env.HC_LEVELDB_KEY;
  if (!hex || typeof hex !== 'string') {
    throw new Error(
      'HC_LEVELDB_KEY가 .env에 없습니다. 64자리 hex(openssl rand -hex 32)로 설정하세요.',
    );
  }
  const key = Buffer.from(hex.trim(), 'hex');
  if (key.length !== 32) {
    throw new Error('HC_LEVELDB_KEY는 정확히 64자리 16진수(32바이트)여야 합니다.');
  }
  return key;
}

function encryptJson(value) {
  const key = getKeyBuffer();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
  const plain = Buffer.from(JSON.stringify(value), 'utf8');
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([Buffer.from([VERSION]), iv, tag, enc]);
  return payload.toString('base64');
}

function decryptJson(b64) {
  const key = getKeyBuffer();
  const raw = Buffer.from(String(b64), 'base64');
  const minLen = 1 + IV_LEN + TAG_LEN + 1;
  if (raw.length < minLen) {
    throw new Error('암호화된 값 형식이 올바르지 않습니다.');
  }
  if (raw[0] !== VERSION) {
    throw new Error('지원하지 않는 암호화 버전입니다.');
  }
  const iv = raw.subarray(1, 1 + IV_LEN);
  const tag = raw.subarray(1 + IV_LEN, 1 + IV_LEN + TAG_LEN);
  const enc = raw.subarray(1 + IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
  return JSON.parse(plain.toString('utf8'));
}

module.exports = { encryptJson, decryptJson, getKeyBuffer };
