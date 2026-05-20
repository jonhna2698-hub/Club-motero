import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { seed } from '../../server/seed.js';

const JWT_SECRET = process.env.JWT_SECRET || 'netlify-dev-secret-change-me';
const db = structuredClone(seed);

export const config = {
  path: '/api/*'
};

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    }
  });
}

function publicUser(user) {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

function signUser(user) {
  return jwt.sign({ id: user.id, role: user.role, nickname: user.nickname }, JWT_SECRET, { expiresIn: '7d' });
}

function getApiPath(request) {
  const { pathname } = new URL(request.url);
  if (pathname.includes('/.netlify/functions/api/')) {
    return `/${pathname.split('/.netlify/functions/api/')[1] || ''}`;
  }
  if (pathname.includes('/api/')) {
    return `/${pathname.split('/api/')[1] || ''}`;
  }
  return '/';
}

function getAuthUser(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

async function readBody(request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return request.json();
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    return Object.fromEntries(form.entries());
  }
  return {};
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') return json({});

  const path = getApiPath(request);
  const method = request.method;

  if (method === 'GET' && path === '/health') return json({ ok: true, club: 'Rapidos y Precoces', runtime: 'netlify' });
  if (method === 'GET' && path === '/stats') return json(db.stats);
  if (method === 'GET' && path === '/routes') return json(db.routes);
  if (method === 'GET' && path === '/gallery') return json(db.gallery);
  if (method === 'GET' && path === '/bikes') return json(db.bikes);
  if (method === 'GET' && path === '/members') return json(db.users.map(publicUser));
  if (method === 'GET' && path === '/events') return json(db.events);
  if (method === 'GET' && path === '/posts') return json(db.posts);

  if (method === 'POST' && path === '/auth/register') {
    const { name, nickname, email, password } = await readBody(request);
    if (!email || !password || !nickname) return json({ message: 'Datos incompletos' }, 400);
    if (db.users.some((user) => user.email === email)) return json({ message: 'Email ya registrado' }, 409);

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
    return json({ token: signUser(user), user: publicUser(user) }, 201);
  }

  if (method === 'POST' && path === '/auth/login') {
    const { email, password } = await readBody(request);
    const user = db.users.find((item) => item.email === email);
    const validPassword = user?.passwordHash?.startsWith('$2')
      ? await bcrypt.compare(password, user.passwordHash)
      : user?.passwordHash === password;
    if (!user || !validPassword) return json({ message: 'Credenciales invalidas' }, 401);
    return json({ token: signUser(user), user: publicUser(user) });
  }

  if (method === 'POST' && path === '/routes') {
    const user = getAuthUser(request);
    if (!user) return json({ message: 'Token requerido' }, 401);
    const route = { id: randomUUID(), createdBy: user.id, ...(await readBody(request)) };
    db.routes.unshift(route);
    return json(route, 201);
  }

  if (method === 'POST' && path === '/gallery') {
    const user = getAuthUser(request);
    if (!user) return json({ message: 'Token requerido' }, 401);
    const body = await readBody(request);
    const photo = {
      id: randomUUID(),
      image: body.image || 'https://images.unsplash.com/photo-1558981852-426c6c22a060?auto=format&fit=crop&w=900&q=80',
      title: body.title || 'Nueva foto biker',
      author: user.nickname,
      moto: body.moto || 'Moto registrada',
      event: body.event || 'Rodada',
      location: body.location || 'Ruta registrada',
      reactions: 0,
      comments: []
    };
    db.gallery.unshift(photo);
    return json(photo, 201);
  }

  if (method === 'POST' && path === '/bikes') {
    const user = getAuthUser(request);
    if (!user) return json({ message: 'Token requerido' }, 401);
    const bike = { id: randomUUID(), ownerId: user.id, votes: 0, ...(await readBody(request)) };
    db.bikes.unshift(bike);
    return json(bike, 201);
  }

  if (method === 'POST' && path === '/events') {
    const user = getAuthUser(request);
    if (!user) return json({ message: 'Token requerido' }, 401);
    const event = { id: randomUUID(), attendees: [user.nickname], ...(await readBody(request)) };
    db.events.unshift(event);
    return json(event, 201);
  }

  if (method === 'GET' && path === '/admin/overview') {
    const user = getAuthUser(request);
    if (!user) return json({ message: 'Token requerido' }, 401);
    if (!['fundador', 'administrador', 'moderador'].includes(user.role)) {
      return json({ message: 'Permiso requerido' }, 403);
    }
    return json(db.admin);
  }

  return json({ message: `Endpoint no encontrado: ${method} ${path}` }, 404);
}
