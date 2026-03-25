const crypto = require('crypto');
const express = require('express');
const db = require('../../db');
const { getKey } = require('../lib/dbKeys');
const { hashPassword, verifyPassword, randomToken } = require('../lib/password');
const { getUserFromToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body || {};
  const em = String(email || '').trim().toLowerCase();
  const nm = String(name || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
    return res.status(400).json({ error: '올바른 이메일을 입력하세요.' });
  }
  if (String(password || '').length < 4) {
    return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다.' });
  }
  if (nm.length < 1) {
    return res.status(400).json({ error: '이름을 입력하세요.' });
  }
  const dup = await getKey(`account:email:${em}`);
  if (dup) {
    return res.status(409).json({ error: '이미 가입된 이메일입니다.' });
  }
  const userId = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  await db.put(`account:email:${em}`, { userId, passwordHash });
  await db.put(`user:${userId}`, { email: em, name: nm, createdAt: new Date().toISOString() });
  await db.put(`user:${userId}:goals`, [
    { id: 'g1', title: '주 3회 운동', target: 3, unit: '회/주', progress: 0 },
    { id: 'g2', title: '하루 수면 7시간', target: 7, unit: '시간', progress: 0 },
  ]);
  await db.put(`user:${userId}:reminders`, [
    { id: 'r1', text: '물 한 잔 마시기', time: '10:00', enabled: true },
    { id: 'r2', text: '스트레칭 5분', time: '15:00', enabled: true },
  ]);
  await db.put(`user:${userId}:settings`, {
    notifyGoals: true,
    notifyReminders: true,
    wearableApple: false,
    wearableGoogle: false,
  });
  const token = randomToken();
  await db.put(`session:${token}`, { userId, createdAt: Date.now() });
  res.json({ token, userId, name: nm, email: em });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const em = String(email || '').trim().toLowerCase();
  try {
    const acc = await getKey(`account:email:${em}`);
    if (!acc) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }
    const ok = verifyPassword(String(password || ''), acc.passwordHash);
    if (!ok) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    const user = await getKey(`user:${acc.userId}`);
    if (!user) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    const token = randomToken();
    await db.put(`session:${token}`, { userId: acc.userId, createdAt: Date.now() });
    res.json({
      token,
      userId: acc.userId,
      name: user.name,
      email: user.email,
    });
  } catch {
    res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  }
});

router.get('/me', async (req, res) => {
  const u = await getUserFromToken(req);
  if (!u) return res.status(401).json({ error: '인증이 필요합니다.' });
  res.json({ userId: u.userId, name: u.name, email: u.email });
});

router.post('/logout', requireAuth, async (req, res) => {
  const h = req.headers.authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (m) {
    try {
      await db.del(`session:${m[1]}`);
    } catch (_) {
      /* ignore */
    }
  }
  res.json({ ok: true });
});

module.exports = router;
