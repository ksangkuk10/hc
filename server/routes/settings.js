const express = require('express');
const db = require('../../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const s = await db.get(`user:${req.user.userId}:settings`);
    res.json({ settings: s && typeof s === 'object' ? s : {} });
  } catch {
    res.json({ settings: {} });
  }
});

router.put('/', requireAuth, async (req, res) => {
  const { settings } = req.body || {};
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'settings 객체가 필요합니다.' });
  }
  await db.put(`user:${req.user.userId}:settings`, settings);
  res.json({ ok: true });
});

module.exports = router;
