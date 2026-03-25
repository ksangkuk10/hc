// 반드시 다른 server 모듈보다 먼저 실행 — .env → process.env 반영
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = require('./app');

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
  console.log(`HealthCare API: http://localhost:${PORT}/`);
});
