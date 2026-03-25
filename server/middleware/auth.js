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
