const express = require('express');
const db = require('../../db');
const { getKey } = require('../lib/dbKeys');
const { hashPassword, verifyPassword } = require('../lib/password');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.put('/', requireAuth, async (req, res) => {
  const { name, password, currentPassword } = req.body || {};
  const user = await getKey(`user:${req.user.userId}`);
  if (!user) return res.status(404).json({ error: '사용자 없음' });
  if (name != null && String(name).trim()) {
    user.name = String(name).trim();
    await db.put(`user:${req.user.userId}`, user);
  }
  if (password && String(password).length >= 4) {
    const acc = await getKey(`account:email:${user.email}`);
    if (!acc) return res.status(404).json({ error: '계정 없음' });
    if (currentPassword && verifyPassword(String(currentPassword), acc.passwordHash)) {
      acc.passwordHash = hashPassword(String(password));
      await db.put(`account:email:${user.email}`, acc);
    } else if (!currentPassword) {
      return res.status(400).json({ error: '비밀번호 변경 시 현재 비밀번호를 입력하세요.' });
    } else {
      return res.status(401).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
    }
  }
  res.json({ ok: true, user: { name: user.name, email: user.email } });
});

module.exports = router;
