const crypto = require('crypto');
const express = require('express');
const db = require('../../db');
const { requireAuth } = require('../middleware/auth');
const { analyzeFaceWellness, getModel } = require('../lib/githubVision');

const router = express.Router();

function heuristicAnalysis(imageBase64, fatigueSelf) {
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
  return { fatigue, skin, mood };
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const list = await db.get(`user:${req.user.userId}:condition`);
    res.json({ data: Array.isArray(list) ? list : [] });
  } catch {
    res.json({ data: [] });
  }
});

function parseFatigueSelf(raw) {
  if (raw == null || String(raw).trim() === '') return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  return Math.min(10, Math.max(1, Math.round(n)));
}

router.post('/analyze', requireAuth, async (req, res) => {
  const { imageBase64, fatigueSelf } = req.body || {};
  const fatigueSelfStored = parseFatigueSelf(fatigueSelf);

  let fatigue;
  let skin;
  let mood;
  let note;
  let aiModel = null;
  let source = 'heuristic';

  const ai = imageBase64 ? await analyzeFaceWellness(imageBase64, 'image/jpeg', fatigueSelf) : null;

  if (ai) {
    source = 'github_models';
    fatigue = ai.fatigueScore;
    skin = ai.skinImpression;
    mood = ai.moodImpression;
    aiModel = getModel();
    note =
      ai.healthSummary +
      `\n\n[분석: GitHub Models · ${aiModel}] ` +
      '본 내용은 일반 웰니스 참고용이며 의료 진단이 아닙니다.';
  } else {
    const h = heuristicAnalysis(imageBase64, fatigueSelf);
    fatigue = h.fatigue;
    skin = h.skin;
    mood = h.mood;
    if (imageBase64) {
      note =
        '데모 추정값입니다. 사진 기반 GPT 분석을 쓰려면 서버에 GITHUB_TOKEN(또는 GITHUB_MODELS_TOKEN)과 GitHub Models 권한을 설정하세요.';
    } else {
      note = '이미지 없음: 피로 슬라이더·난수 기반 데모입니다. 웹캠/사진으로 분석하면 GitHub Models(gpt-4.1) 연동을 시도합니다.';
    }
  }

  const entry = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    fatigue,
    skin,
    mood,
    fatigueSelf: fatigueSelfStored,
    note,
    source,
    aiModel,
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
