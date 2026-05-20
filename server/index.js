import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { seed } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const db = structuredClone(seed);

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json({ limit: '8mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

function publicUser(user) {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

function signUser(user) {
  return jwt.sign({ id: user.id, role: user.role, nickname: user.nickname }, JWT_SECRET, { expiresIn: '7d' });
}

function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Token requerido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Token invalido' });
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, club: 'Rapidos y Precoces' }));
app.get('/api/stats', (_req, res) => res.json(db.stats));
app.get('/api/routes', (_req, res) => res.json(db.routes));
app.get('/api/gallery', (_req, res) => res.json(db.gallery));
app.get('/api/bikes', (_req, res) => res.json(db.bikes));
app.get('/api/members', (_req, res) => res.json(db.users.map(publicUser)));
app.get('/api/events', (_req, res) => res.json(db.events));
app.get('/api/posts', (_req, res) => res.json(db.posts));

app.post('/api/auth/register', async (req, res) => {
  const { name, nickname, email, password } = req.body;
  if (!email || !password || !nickname) return res.status(400).json({ message: 'Datos incompletos' });
  if (db.users.some((user) => user.email === email)) return res.status(409).json({ message: 'Email ya registrado' });
  const user = {
    id: randomUUID(),
    name: name || nickname,
    nickname,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: 'integrante',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
    joinedAt: new Date().toISOString().slice(0, 10),
    socials: '',
    bike: 'Por registrar',
    routes: 0,
    km: 0
  };
  db.users.push(user);
  res.status(201).json({ token: signUser(user), user: publicUser(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find((item) => item.email === email);
  const validPassword = user?.passwordHash?.startsWith('$2')
    ? await bcrypt.compare(password, user.passwordHash)
    : user?.passwordHash === password;
  if (!user || !validPassword) {
    return res.status(401).json({ message: 'Credenciales invalidas' });
  }
  res.json({ token: signUser(user), user: publicUser(user) });
});

app.post('/api/routes', auth, (req, res) => {
  const route = { id: randomUUID(), createdBy: req.user.id, ...req.body };
  db.routes.unshift(route);
  res.status(201).json(route);
});

app.post('/api/gallery', auth, upload.single('image'), (req, res) => {
  const photo = {
    id: randomUUID(),
    image: req.file ? `/uploads/${req.file.filename}` : req.body.image,
    title: req.body.title || 'Nueva foto biker',
    author: req.user.nickname,
    moto: req.body.moto || 'Moto registrada',
    event: req.body.event || 'Rodada',
    location: req.body.location || 'Ruta registrada',
    reactions: 0,
    comments: []
  };
  db.gallery.unshift(photo);
  res.status(201).json(photo);
});

app.post('/api/bikes', auth, (req, res) => {
  const bike = { id: randomUUID(), ownerId: req.user.id, votes: 0, ...req.body };
  db.bikes.unshift(bike);
  res.status(201).json(bike);
});

app.post('/api/events', auth, (req, res) => {
  const event = { id: randomUUID(), attendees: [req.user.nickname], ...req.body };
  db.events.unshift(event);
  res.status(201).json(event);
});

app.get('/api/admin/overview', auth, (req, res) => {
  if (!['fundador', 'administrador', 'moderador'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Permiso requerido' });
  }
  res.json(db.admin);
});

app.listen(PORT, () => {
  console.log(`API Rapidos y Precoces lista en http://localhost:${PORT}`);
});
