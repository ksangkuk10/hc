// 반드시 다른 server 모듈보다 먼저 실행 — .env → process.env 반영
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

try {
  require('../db/cryptoAtRest').getKeyBuffer();
} catch (e) {
  console.error('[FATAL]', e.message);
  process.exit(1);
}

const PORT = process.env.PORT || 3010;

(async () => {
  try {
    const { openDatabase } = require('../db/leveldb');
    await openDatabase();
  } catch (e) {
    console.error('[FATAL] LevelDB를 열 수 없습니다.', e.message || e);
    process.exit(1);
  }

  const app = require('./app');
  app.listen(PORT, () => {
    console.log(`HealthCare API: http://localhost:${PORT}/`);
  });
})();
