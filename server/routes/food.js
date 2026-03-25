const crypto = require('crypto');
const express = require('express');
const db = require('../../db');
const { requireAuth } = require('../middleware/auth');
const { analyzeFoodImage, getModel } = require('../lib/githubVision');

const router = express.Router();

/** 저장 이미지 바이너리 상한 (500KB) — 초과 시 이력에 사진 미저장 */
const MAX_STORED_IMAGE_BYTES = 500 * 1024;

function clipImageForStorage(imageBase64) {
  if (!imageBase64 || typeof imageBase64 !== 'string') return null;
  const s = imageBase64.replace(/^data:image\/\w+;base64,/, '').trim();
  if (s.length < 80) return null;
  let buf;
  try {
    buf = Buffer.from(s, 'base64');
  } catch {
    return null;
  }
  if (buf.length > MAX_STORED_IMAGE_BYTES) return null;
  return s;
}

function heuristicFood(label, hasImage) {
  const text = String(label || '').trim() || '일반 식사';
  const seed = crypto.createHash('sha256').update(text + (hasImage ? '1' : '0')).digest();
  const cal = 300 + (seed[0] + seed[1]) % 500;
  const protein = 10 + seed[2] % 25;
  const carbs = 30 + seed[3] % 40;
  const sodium = 400 + seed[4] % 800;
  const advice =
    sodium > 1000
      ? '나트륨이 다소 높을 수 있습니다. 물을 충분히 드시고 다음 끼니는 가볍게 조절해 보세요.'
      : '균형 잡힌 한 끼로 보입니다. 채소를 한 가지 더하면 더 좋습니다.';
  return {
    label: text,
    nutrition: { kcal: cal, proteinG: protein, carbsG: carbs, sodiumMg: sodium },
    advice,
    note: hasImage
      ? '데모 추정값입니다. GITHUB_TOKEN 설정 시 사진 기반 AI 분석을 시도합니다.'
      : '텍스트·난수 기반 데모입니다. 사진을 올리면 GitHub Models 분석을 시도합니다.',
    source: 'heuristic',
    aiModel: null,
  };
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const list = await db.get(`user:${req.user.userId}:food`);
    res.json({ data: Array.isArray(list) ? list : [] });
  } catch {
    res.json({ data: [] });
  }
});

function normalizeImageMime(m) {
  const s = String(m || 'image/jpeg').toLowerCase();
  if (s === 'image/jpg') return 'image/jpeg';
  if (/^image\/(jpeg|png|webp)$/.test(s)) return s;
  return 'image/jpeg';
}

router.post('/analyze', requireAuth, async (req, res) => {
  const { label, imageBase64, imageMime: rawMime } = req.body || {};
  const textHint = String(label || '').trim() || '일반 식사';
  const imageMime = normalizeImageMime(rawMime);

  let entry;
  const ai = imageBase64 ? await analyzeFoodImage(imageBase64, imageMime, textHint) : null;
  const storedImage = clipImageForStorage(imageBase64);

  if (ai) {
    entry = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      label: ai.dishName,
      nutrition: {
        kcal: ai.estimatedKcal,
        proteinG: ai.proteinG,
        carbsG: ai.carbsG,
        sodiumMg: ai.sodiumMg,
      },
      advice: ai.mealAdvice,
      note: `[GitHub Models · ${getModel()}] 참고용 추정이며 임상 영양 분석이 아닙니다.`,
      source: 'github_models',
      aiModel: getModel(),
      imageBase64: storedImage,
      imageMime: storedImage ? imageMime : null,
    };
  } else {
    const h = heuristicFood(textHint, !!imageBase64);
    entry = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      label: h.label,
      nutrition: h.nutrition,
      advice: h.advice,
      note: h.note,
      source: h.source,
      aiModel: h.aiModel,
      imageBase64: storedImage,
      imageMime: storedImage ? imageMime : null,
    };
  }

  let list = [];
  try {
    list = await db.get(`user:${req.user.userId}:food`);
  } catch {
    /* */
  }
  if (!Array.isArray(list)) list = [];
  list.unshift(entry);
  await db.put(`user:${req.user.userId}:food`, list.slice(0, 200));
  res.json({ entry });
});

module.exports = router;
