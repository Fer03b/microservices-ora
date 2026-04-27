const jwt = require('jsonwebtoken');

// ⚠️ Doit être le MÊME secret que celui de auth-service
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token manquant' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

module.exports = { requireAuth };
