const express = require('express');
const db = require('../../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const r = await db.get(`user:${req.user.userId}:reminders`);
    res.json({ data: Array.isArray(r) ? r : [] });
  } catch {
    res.json({ data: [] });
  }
});

router.put('/', requireAuth, async (req, res) => {
  const { data } = req.body || {};
  if (!Array.isArray(data)) return res.status(400).json({ error: 'data는 배열이어야 합니다.' });
  await db.put(`user:${req.user.userId}:reminders`, data);
  res.json({ ok: true });
});

module.exports = router;
