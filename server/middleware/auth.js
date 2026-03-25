/**
 * 세션의 Bearer 토큰만으로 사용자를 식별합니다. 요청 본문·쿼리의 userId는 신뢰하지 않습니다.
 * 건강·컨디션·식단·상담 등 저장소 키는 항상 `user:${req.user.userId}:…` 형태만 사용해야 합니다.
 */
const { getKey } = require('../lib/dbKeys');

async function getUserFromToken(req) {
  const h = req.headers.authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return null;
  const token = m[1];
  try {
    const sid = await getKey(`session:${token}`);
    if (!sid?.userId) return null;
    const user = await getKey(`user:${sid.userId}`);
    return user ? { ...user, userId: sid.userId } : null;
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  getUserFromToken(req)
    .then((u) => {
      if (!u) {
        res.status(401).json({ error: '인증이 필요합니다.' });
        return;
      }
      req.user = u;
      next();
    })
    .catch(() => res.status(401).json({ error: '인증이 필요합니다.' }));
}

module.exports = { getUserFromToken, requireAuth };
