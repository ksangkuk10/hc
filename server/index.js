// server/index.js
// 헬스케어 웹서비스 메인 API 서버 엔트리 (Express 기반)

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('../db');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 예시 API: 유저 건강 데이터 저장/불러오기
app.post('/api/health', async (req, res) => {
  const { userId, data } = req.body;
  try {
    await db.put(`user:${userId}:health`, data);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/health/:userId', async (req, res) => {
  try {
    const data = await db.get(`user:${req.params.userId}:health`);
    res.json({ data });
  } catch (e) {
    res.status(404).json({ error: 'Not found' });
  }
});

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
  console.log(`HealthCare API server listening on port ${PORT}`);
});
