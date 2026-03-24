// db/index.js
// DB 어댑터 엔트리 파일. 실제로 사용하는 DB에 따라 require 경로만 바꿔주면 됨.
// 예) 앞으로 mongo, postgres, sqlite 등으로 쉽게 전환 가능

module.exports = require('./leveldb');
