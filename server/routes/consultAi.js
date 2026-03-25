const crypto = require('crypto');
const express = require('express');
const db = require('../../db');
const { requireAuth } = require('../middleware/auth');
const { analyzeSymptomsEducation, getToken } = require('../lib/githubVision');

/**
 * POST /api/consult/ai — 마운트 시 경로가 / 이므로 라우터 중첩(/consult + /ai) 이슈를 피함
 */
const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
  const { symptoms } = req.body || {};
  const msg = String(symptoms || '').trim();
  if (msg.length < 5) {
    return res.status(400).json({ error: '증상을 5자 이상 입력해 주세요.' });
  }
  if (!getToken()) {
    return res.status(503).json({
      error: 'AI 상담을 사용하려면 서버에 GITHUB_TOKEN(또는 GITHUB_MODELS_TOKEN)이 설정되어 있어야 합니다.',
    });
  }

  const answer = await analyzeSymptomsEducation(msg);
  if (!answer) {
    return res.status(502).json({
      error: 'AI 응답을 가져오지 못했습니다. 잠시 후 다시 시도하거나 토큰·모델 설정을 확인해 주세요.',
    });
  }

  const item = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    type: 'ai',
    message: msg,
    status: '완료',
    answer,
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
