const crypto = require('crypto');
const express = require('express');
const db = require('../../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const list = await db.get(`user:${req.user.userId}:condition`);
    res.json({ data: Array.isArray(list) ? list : [] });
  } catch {
    res.json({ data: [] });
  }
});

router.post('/analyze', requireAuth, async (req, res) => {
  const { imageBase64, fatigueSelf } = req.body || {};
  const seed = imageBase64
    ? crypto.createHash('sha256').update(String(imageBase64).slice(0, 500)).digest()
    : crypto.randomBytes(8);
  const n = (i) => seed[i % seed.length] / 255;
  const fatigue = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        fatigueSelf != null && fatigueSelf !== ''
          ? Number(fatigueSelf) * 10
          : 30 + n(0) * 50 + n(1) * 20,
      ),
    ),
  );
  const skin = ['양호', '보통', '건조'][Math.floor(n(2) * 3) % 3];
  const mood = ['차분', '보통', '활기'][Math.floor(n(3) * 3) % 3];
  const entry = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    fatigue,
    skin,
    mood,
    note: '데모: 실제 서비스에서는 검증된 AI·의료기기 연동이 필요합니다.',
  };
  let list = [];
  try {
    list = await db.get(`user:${req.user.userId}:condition`);
  } catch (_) {
    /* empty */
  }
  if (!Array.isArray(list)) list = [];
  list.unshift(entry);
  await db.put(`user:${req.user.userId}:condition`, list.slice(0, 100));
  res.json({ analysis: entry });
});

module.exports = router;
