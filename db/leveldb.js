// db/leveldb.js
// LevelDB 어댑터: 모든 DB 요청은 이 모듈을 통해 처리됨.
// 다른 DB로 교체시에는 이 파일만 교체하면 됨.

const { Level } = require('level');
const path = require('path');

const db = new Level(path.join(__dirname, '../_data/leveldb'), { valueEncoding: 'json' });

module.exports = {
  async put(key, value) { return db.put(key, value); },
  async get(key) { return db.get(key); },
  async del(key) { return db.del(key); },
  createReadStream(options) { return db.createReadStream(options); }
};
