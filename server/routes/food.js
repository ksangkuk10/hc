const crypto = require('crypto');
const express = require('express');
const db = require('../../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const list = await db.get(`user:${req.user.userId}:food`);
    res.json({ data: Array.isArray(list) ? list : [] });
  } catch {
    res.json({ data: [] });
  }
});

router.post('/analyze', requireAuth, async (req, res) => {
  const { label, imageBase64 } = req.body || {};
  const text = String(label || '').trim() || '일반 식사';
  const seed = crypto.createHash('sha256').update(text + (imageBase64 ? '1' : '0')).digest();
  const cal = 300 + (seed[0] + seed[1]) % 500;
  const protein = 10 + seed[2] % 25;
  const carbs = 30 + seed[3] % 40;
  const sodium = 400 + seed[4] % 800;
  const advice =
    sodium > 1000
      ? '나트륨이 다소 높을 수 있습니다. 물을 충분히 드시고 다음 끼니는 가볍게 조절해 보세요.'
      : '균형 잡힌 한 끼로 보입니다. 채소를 한 가지 더하면 더 좋습니다.';
  const entry = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    label: text,
    nutrition: { kcal: cal, proteinG: protein, carbsG: carbs, sodiumMg: sodium },
    advice,
    note: '데모: 실제 서비스에서는 영양 DB·비전 모델 연동이 필요합니다.',
  };
  let list = [];
  try {
    list = await db.get(`user:${req.user.userId}:food`);
  } catch (_) {
    /* */
  }
  if (!Array.isArray(list)) list = [];
  list.unshift(entry);
  await db.put(`user:${req.user.userId}:food`, list.slice(0, 200));
  res.json({ entry });
});

module.exports = router;
