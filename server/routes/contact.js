const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { suggestNearbyHospitalsByLocation, getToken, getModel } = require('../lib/githubVision');

const router = express.Router();

/**
 * POST /api/contact/emergency-nearby-ai
 * Body: { lat, lng } — GitHub Models GPT-4.1 기반 근처 병원·응급 안내 (참고용)
 */
router.post('/emergency-nearby-ai', requireAuth, async (req, res) => {
  const { lat, lng } = req.body || {};
  const la = parseFloat(lat);
  const ln = parseFloat(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) {
    return res.status(400).json({ error: '위도·경도가 필요합니다.' });
  }
  if (la < -90 || la > 90 || ln < -180 || ln > 180) {
    return res.status(400).json({ error: '위도·경도 범위가 올바르지 않습니다.' });
  }
  if (!getToken()) {
    return res.status(503).json({
      error: 'AI 안내를 사용하려면 서버에 GITHUB_TOKEN(또는 GITHUB_MODELS_TOKEN)이 설정되어 있어야 합니다.',
    });
  }

  const text = await suggestNearbyHospitalsByLocation(la, ln);
  if (!text) {
    return res.status(502).json({
      error: 'AI 응답을 가져오지 못했습니다. 잠시 후 다시 시도하거나 토큰·모델 설정을 확인해 주세요.',
    });
  }

  res.json({
    text,
    model: getModel(),
    note:
      '위 내용은 AI가 위치 좌표를 바탕으로 한 참고 안내이며, 실시간·정확한 응급실 정보가 아닙니다. 반드시 119·1339 또는 공식 지도·병원에 확인하세요.',
  });
});

module.exports = router;
