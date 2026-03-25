const crypto = require('crypto');
const express = require('express');
const db = require('../../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const list = await db.get(`user:${req.user.userId}:consult`);
    res.json({ data: Array.isArray(list) ? list : [] });
  } catch {
    res.json({ data: [] });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { type, message } = req.body || {};
  const t = String(type || 'text');
  const msg = String(message || '').trim();
  if (msg.length < 5) return res.status(400).json({ error: '질문을 5자 이상 입력해 주세요.' });
  const item = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    type: t,
    message: msg,
    status: '접수됨',
    answer: null,
  };
  let list = [];
  try {
    list = await db.get(`user:${req.user.userId}:consult`);
  } catch (_) {
    /* */
  }
  if (!Array.isArray(list)) list = [];
  list.unshift(item);
  await db.put(`user:${req.user.userId}:consult`, list.slice(0, 50));
  res.json({ item });
});

module.exports = router;
