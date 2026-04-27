const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const grpc = require('@grpc/grpc-js');
const dataClient = require('./data-client');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';
const JWT_EXPIRY = '24h';

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

// POST /auth/register
app.post('/auth/register', async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password et name requis' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await dataClient.createUser({ email, name, passwordHash });
    const token = jwt.sign(
      { sub: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
    console.log(`[auth] registered user ${email} (id=${user.id})`);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (err) {
    // Email déjà utilisé → data-service renvoie ALREADY_EXISTS (code 6)
    if (err.code === grpc.status.ALREADY_EXISTS) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }
    console.error('[auth] register error:', err.message);
    res.status(500).json({ error: 'Erreur serveur lors de l\'inscription' });
  }
});

// POST /auth/login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email et password requis' });
  }

  try {
    const user = await dataClient.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe invalide' });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Email ou mot de passe invalide' });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
    console.log(`[auth] login ${email}`);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (err) {
    console.error('[auth] login error:', err.message);
    res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
  }
});

// GET /auth/me
app.get('/auth/me', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token manquant' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await dataClient.findUserById(payload.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
});

app.listen(PORT, () => {
  console.log(`[auth-service] listening on port ${PORT}`);
});
