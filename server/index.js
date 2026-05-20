import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  attendEvent,
  commentPhoto,
  createBike,
  createEvent,
  createPhoto,
  createPost,
  createRoute,
  deleteBike,
  deleteEvent,
  deletePhoto,
  deletePost,
  deleteRoute,
  getAdminOverview,
  getHealth,
  getStats,
  listBikes,
  listEvents,
  listGallery,
  listMembers,
  listPosts,
  listRoutes,
  loginMember,
  publicUser,
  reactPhoto,
  registerMember,
  setFeaturedBike,
  updateBike,
  updateEvent,
  updateMember,
  updatePhoto,
  updatePost,
  updateRoute,
  voteBike
} from './store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json({ limit: '8mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

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

function requireAdmin(req, res, next) {
  if (!['fundador', 'administrador', 'moderador'].includes(req.user?.role)) {
    return res.status(403).json({ message: 'Permiso requerido' });
  }
  next();
}

function asyncRoute(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error interno' });
    }
  };
}

app.get('/api/health', asyncRoute(async (_req, res) => res.json(await getHealth())));
app.get('/api/stats', asyncRoute(async (_req, res) => res.json(await getStats())));
app.get('/api/routes', asyncRoute(async (_req, res) => res.json(await listRoutes())));
app.get('/api/gallery', asyncRoute(async (_req, res) => res.json(await listGallery())));
app.get('/api/bikes', asyncRoute(async (_req, res) => res.json(await listBikes())));
app.get('/api/members', asyncRoute(async (_req, res) => res.json(await listMembers())));
app.get('/api/events', asyncRoute(async (_req, res) => res.json(await listEvents())));
app.get('/api/posts', asyncRoute(async (_req, res) => res.json(await listPosts())));

app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const user = await registerMember(req.body);
  res.status(201).json({ token: signUser(user), user: publicUser(user) });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const user = await loginMember(req.body);
  res.json({ token: signUser(user), user: publicUser(user) });
}));

app.post('/api/routes', auth, asyncRoute(async (req, res) => {
  res.status(201).json(await createRoute(req.body, req.user));
}));

app.patch('/api/routes/:id', auth, asyncRoute(async (req, res) => {
  const route = await updateRoute(req.params.id, req.body);
  if (!route) return res.status(404).json({ message: 'Ruta no encontrada' });
  res.json(route);
}));

app.delete('/api/routes/:id', auth, requireAdmin, asyncRoute(async (req, res) => {
  await deleteRoute(req.params.id);
  res.json({ ok: true });
}));

app.post('/api/gallery', auth, upload.single('image'), asyncRoute(async (req, res) => {
  const photo = await createPhoto({
    ...req.body,
    image: req.file ? `/uploads/${req.file.filename}` : req.body.image
  }, req.user);
  res.status(201).json(photo);
}));

app.patch('/api/gallery/:id', auth, asyncRoute(async (req, res) => {
  const photo = await updatePhoto(req.params.id, req.body);
  if (!photo) return res.status(404).json({ message: 'Foto no encontrada' });
  res.json(photo);
}));

app.delete('/api/gallery/:id', auth, asyncRoute(async (req, res) => {
  await deletePhoto(req.params.id);
  res.json({ ok: true });
}));

app.post('/api/gallery/:id/comments', auth, asyncRoute(async (req, res) => {
  const photo = await commentPhoto(req.params.id, req.body, req.user);
  if (!photo) return res.status(404).json({ message: 'Foto no encontrada' });
  res.status(201).json(photo);
}));

app.post('/api/gallery/:id/react', asyncRoute(async (req, res) => {
  const photo = await reactPhoto(req.params.id);
  if (!photo) return res.status(404).json({ message: 'Foto no encontrada' });
  res.json(photo);
}));

app.post('/api/bikes', auth, asyncRoute(async (req, res) => {
  res.status(201).json(await createBike(req.body, req.user));
}));

app.post('/api/bikes/:id/vote', asyncRoute(async (req, res) => {
  const bike = await voteBike(req.params.id);
  if (!bike) return res.status(404).json({ message: 'Moto no encontrada' });
  res.json(bike);
}));

app.patch('/api/bikes/:id', auth, asyncRoute(async (req, res) => {
  const bike = await updateBike(req.params.id, req.body);
  if (!bike) return res.status(404).json({ message: 'Moto no encontrada' });
  res.json(bike);
}));

app.delete('/api/bikes/:id', auth, requireAdmin, asyncRoute(async (req, res) => {
  await deleteBike(req.params.id);
  res.json({ ok: true });
}));

app.post('/api/bikes/:id/featured', auth, requireAdmin, asyncRoute(async (req, res) => {
  const bike = await setFeaturedBike(req.params.id);
  if (!bike) return res.status(404).json({ message: 'Moto no encontrada' });
  res.json(bike);
}));

app.post('/api/events', auth, asyncRoute(async (req, res) => {
  res.status(201).json(await createEvent(req.body, req.user));
}));

app.post('/api/events/:id/attend', auth, asyncRoute(async (req, res) => {
  const event = await attendEvent(req.params.id, req.user);
  if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
  res.json(event);
}));

app.patch('/api/events/:id', auth, requireAdmin, asyncRoute(async (req, res) => {
  const event = await updateEvent(req.params.id, req.body);
  if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
  res.json(event);
}));

app.delete('/api/events/:id', auth, requireAdmin, asyncRoute(async (req, res) => {
  await deleteEvent(req.params.id);
  res.json({ ok: true });
}));

app.post('/api/posts', auth, asyncRoute(async (req, res) => {
  res.status(201).json(await createPost(req.body, req.user));
}));

app.patch('/api/posts/:id', auth, asyncRoute(async (req, res) => {
  const post = await updatePost(req.params.id, req.body);
  if (!post) return res.status(404).json({ message: 'Post no encontrado' });
  res.json(post);
}));

app.delete('/api/posts/:id', auth, requireAdmin, asyncRoute(async (req, res) => {
  await deletePost(req.params.id);
  res.json({ ok: true });
}));

app.patch('/api/members/:id', auth, asyncRoute(async (req, res) => {
  const member = await updateMember(req.params.id, req.body, req.user);
  if (!member) return res.status(404).json({ message: 'Miembro no encontrado' });
  res.json(member);
}));

app.get('/api/admin/overview', auth, asyncRoute(async (req, res) => {
  if (!['fundador', 'administrador', 'moderador'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Permiso requerido' });
  }
  res.json(await getAdminOverview());
}));

app.listen(PORT, () => {
  console.log(`API Rapidos y Precoces lista en http://localhost:${PORT}`);
});
