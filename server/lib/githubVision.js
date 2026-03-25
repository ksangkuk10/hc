/**
 * GitHub Models (models.github.ai) — 멀티모달 비전 호출
 * 인증: GITHUB_TOKEN 또는 GITHUB_MODELS_TOKEN (PAT, models:read)
 * @see https://docs.github.com/en/rest/models/inference
 */

const GITHUB_MODELS_URL = 'https://models.github.ai/inference/chat/completions';

function getToken() {
  return process.env.GITHUB_TOKEN || process.env.GITHUB_MODELS_TOKEN || process.env.GH_TOKEN || '';
}

function getModel() {
  return process.env.GITHUB_MODEL || 'openai/gpt-4.1';
}

function parseAssistantJson(content) {
  if (!content || typeof content !== 'string') return null;
  let jsonStr = content.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(jsonStr);
  if (fence) jsonStr = fence[1].trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * @returns {Promise<string|null>} assistant message content
 */
async function visionChatCompletion(systemPrompt, userText, imageBase64Plain, mimeType = 'image/jpeg') {
  const token = getToken();
  if (!token || !imageBase64Plain) return null;

  const b64 = String(imageBase64Plain).replace(/^data:image\/\w+;base64,/, '').trim();
  if (b64.length < 32) return null;

  const model = getModel();
  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        { type: 'text', text: userText },
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${b64}`,
          },
        },
      ],
    },
  ];

  const baseOpts = {
    model,
    messages,
    max_tokens: 900,
    temperature: 0.25,
  };

  try {
    let res = await fetch(GITHUB_MODELS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2026-03-10',
      },
      body: JSON.stringify({ ...baseOpts, response_format: { type: 'json_object' } }),
    });

    let rawText = await res.text();
    if (!res.ok && (res.status === 400 || res.status === 422)) {
      res = await fetch(GITHUB_MODELS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2026-03-10',
        },
        body: JSON.stringify({
          ...baseOpts,
          messages: [
            {
              role: 'system',
              content: `${systemPrompt} Output valid JSON only, no markdown.`,
            },
            baseOpts.messages[1],
          ],
        }),
      });
      rawText = await res.text();
    }

    if (!res.ok) {
      console.error('[githubVision]', res.status, rawText.slice(0, 500));
      return null;
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return null;
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') return null;
    return content;
  } catch (e) {
    console.error('[githubVision]', e.message || e);
    return null;
  }
}

/**
 * @param {string} [fatigueSelf]
 */
async function analyzeFaceWellness(imageBase64Plain, mimeType = 'image/jpeg', fatigueSelf) {
  const selfHint =
    fatigueSelf != null && fatigueSelf !== ''
      ? `사용자가 주관적 피로를 1~10 중 ${String(fatigueSelf)}로 입력했습니다. JSON의 fatigueScore는 0~100 정수로, 이 값과 시각적 인상을 함께 고려하세요.`
      : '주관적 피로 입력 없음. 시각적 인상만으로 fatigueScore(0~100)를 추정하세요.';

  const systemPrompt = [
    'You analyze a single face photo for general wellness coaching only.',
    'You must NOT diagnose disease, prescribe treatment, or make medical claims.',
    'Respond with ONE JSON object only, no markdown.',
    'Keys (exact): "fatigueScore" (integer 0-100), "skinImpression" (short Korean phrase),',
    '"moodImpression" (short Korean phrase), "healthSummary" (2-5 sentences in Korean, supportive, non-alarming).',
    selfHint,
  ].join(' ');

  const userText = [
    '이 얼굴 사진을 피부 상태, 혈색, 눈의 충혈도, 주름등 얼굴의 모습을 다양하게 분석해서 현재의 건강 상태, 컨디션, 피로도 관점에서만 설명해 주세요.',
    '의료 진단·약 처방·질병명 언급은 하지 마세요.',
    'JSON만 출력하세요.',
  ].join(' ');

  const content = await visionChatCompletion(systemPrompt, userText, imageBase64Plain, mimeType);
  if (!content) return null;

  const parsed = parseAssistantJson(content);
  if (!parsed) {
    return {
      fatigueScore: 50,
      skinImpression: '분석',
      moodImpression: '보통',
      healthSummary: content,
    };
  }

  const fatigueScore = Math.min(
    100,
    Math.max(0, Math.round(Number(parsed.fatigueScore))),
  );
  return {
    fatigueScore: Number.isFinite(fatigueScore) ? fatigueScore : 50,
    skinImpression: String(parsed.skinImpression || '보통').slice(0, 80),
    moodImpression: String(parsed.moodImpression || '보통').slice(0, 80),
    healthSummary: String(parsed.healthSummary || '').slice(0, 2000),
  };
}

/**
 * 음식 사진 기반 대략적 영양 추정 (의료·진단 아님)
 * @param {string} [userLabel] - 사용자가 입력한 음식명 힌트
 */
async function analyzeFoodImage(imageBase64Plain, mimeType = 'image/jpeg', userLabel) {
  const labelHint =
    userLabel && String(userLabel).trim()
      ? `사용자가 "${String(userLabel).trim().slice(0, 200)}"라고 입력했으니 사진과 함께 참고하세요.`
      : '사용자 텍스트 없음. 사진만으로 음식 종류를 추정하세요.';

  const systemPrompt = [
    'You estimate a meal from ONE food photo for wellness logging only.',
    'You are NOT a medical device. Give rough estimates, not clinical nutrition labels.',
    'Respond with ONE JSON object only, no markdown.',
    'Keys (exact): "dishName" (Korean, short dish name or description),',
    '"estimatedKcal" (integer, rough kcal for the visible portion),',
    '"proteinG", "carbsG", "sodiumMg" (integers, rough estimates),',
    '"mealAdvice" (2-4 sentences Korean: balance, sodium, variety — non-medical).',
    labelHint,
  ].join(' ');

  const userText = [
    '이 음식 사진을 보고 위 JSON 형식으로만 답하세요.',
    '정확한 영양 성분표가 아니라 참고용 추정임을 염두에 두세요.',
  ].join(' ');

  const content = await visionChatCompletion(systemPrompt, userText, imageBase64Plain, mimeType);
  if (!content) return null;

  const parsed = parseAssistantJson(content);
  if (!parsed) return null;

  const kcal = Math.min(5000, Math.max(0, Math.round(Number(parsed.estimatedKcal))));
  const proteinG = Math.min(200, Math.max(0, Math.round(Number(parsed.proteinG))));
  const carbsG = Math.min(300, Math.max(0, Math.round(Number(parsed.carbsG))));
  const sodiumMg = Math.min(10000, Math.max(0, Math.round(Number(parsed.sodiumMg))));

  return {
    dishName: String(parsed.dishName || '음식').slice(0, 120),
    estimatedKcal: Number.isFinite(kcal) ? kcal : 400,
    proteinG: Number.isFinite(proteinG) ? proteinG : 15,
    carbsG: Number.isFinite(carbsG) ? carbsG : 40,
    sodiumMg: Number.isFinite(sodiumMg) ? sodiumMg : 600,
    mealAdvice: String(parsed.mealAdvice || '').slice(0, 2000),
  };
}

module.exports = {
  analyzeFaceWellness,
  analyzeFoodImage,
  getToken,
  getModel,
};
