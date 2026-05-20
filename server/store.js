import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { seed } from './seed.js';

const db = structuredClone(seed);
const bucket = process.env.SUPABASE_PHOTOS_BUCKET || 'club-photos';
const supabaseEnabled = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

async function supabaseRequest(table, { method = 'GET', query = '', body, prefer = 'return=representation' } = {}) {
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: prefer
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(payload?.message || payload?.hint || 'Error de Supabase');
    error.status = response.status;
    throw error;
  }
  return payload;
}

function first(rowset) {
  return Array.isArray(rowset) ? rowset[0] : rowset;
}

function publicUser(user) {
  const { passwordHash: _passwordHash, password_hash: _password_hash, ...safe } = user;
  return normalizeMember(safe);
}

function normalizeMember(member) {
  if (!member) return member;
  return {
    id: member.id,
    name: member.name,
    nickname: member.nickname,
    email: member.email,
    role: member.role,
    avatar: member.avatar,
    joinedAt: member.joinedAt || member.joined_at,
    socials: member.socials,
    bike: member.bike,
    routes: member.routes,
    km: member.km
  };
}

function normalizeEvent(event) {
  if (!event) return event;
  return {
    ...event,
    meetingPoint: event.meetingPoint || event.meeting_point
  };
}

function memberPasswordHash(member) {
  return member?.passwordHash || member?.password_hash;
}

async function uploadDataUrl(image, folder = 'gallery') {
  if (!supabaseEnabled || !image?.startsWith('data:image/')) return image;

  const [metadata, base64] = image.split(',');
  const contentType = metadata.match(/data:(.*);base64/)?.[1] || 'image/jpeg';
  const extension = contentType.split('/')[1] || 'jpg';
  const filePath = `${folder}/${randomUUID()}.${extension}`;
  const buffer = Buffer.from(base64, 'base64');

  const response = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': contentType
    },
    body: buffer
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || 'No se pudo subir la imagen a Supabase Storage');
  }

  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
}

export function isSupabaseConfigured() {
  return supabaseEnabled;
}

export async function getHealth() {
  return { ok: true, club: 'Rapidos y Precoces', database: supabaseEnabled ? 'supabase' : 'memory' };
}

export async function getStats() {
  if (!supabaseEnabled) return db.stats;
  const [members, routes, bikes] = await Promise.all([
    supabaseRequest('members', { query: '?select=km' }),
    supabaseRequest('routes', { query: '?select=id' }),
    supabaseRequest('bikes', { query: '?select=id' })
  ]);
  return {
    kilometers: members.reduce((sum, member) => sum + Number(member.km || 0), 0),
    routes: routes.length,
    members: members.length,
    bikes: bikes.length
  };
}

export async function listRoutes() {
  if (!supabaseEnabled) return db.routes;
  return supabaseRequest('routes', { query: '?select=*&order=date.desc' });
}

export async function listGallery() {
  if (!supabaseEnabled) return db.gallery;
  return supabaseRequest('gallery_photos', { query: '?select=*&order=created_at.desc' });
}

export async function listBikes() {
  if (!supabaseEnabled) return db.bikes;
  return supabaseRequest('bikes', { query: '?select=*&order=votes.desc' });
}

export async function listMembers() {
  if (!supabaseEnabled) return db.users.map(publicUser);
  return (await supabaseRequest('members', { query: '?select=*&order=km.desc' })).map(publicUser);
}

export async function listEvents() {
  if (!supabaseEnabled) return db.events;
  return (await supabaseRequest('events', { query: '?select=*&order=date.asc' })).map(normalizeEvent);
}

export async function listPosts() {
  if (!supabaseEnabled) return db.posts;
  return supabaseRequest('posts', { query: '?select=*&order=created_at.desc' });
}

export async function getAdminOverview() {
  return db.admin;
}

export async function registerMember(body) {
  const { name, nickname, email, password } = body;
  if (!email || !password || !nickname) {
    const error = new Error('Datos incompletos');
    error.status = 400;
    throw error;
  }

  if (!supabaseEnabled) {
    if (db.users.some((user) => user.email === email)) {
      const error = new Error('Email ya registrado');
      error.status = 409;
      throw error;
    }
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
    return user;
  }

  const existing = first(await supabaseRequest('members', { query: `?select=id&email=eq.${encodeURIComponent(email)}&limit=1` }));
  if (existing) {
    const error = new Error('Email ya registrado');
    error.status = 409;
    throw error;
  }

  const user = first(await supabaseRequest('members', { method: 'POST', body: {
    id: randomUUID(),
    name: name || nickname,
    nickname,
    email,
    password_hash: await bcrypt.hash(password, 10),
    role: 'integrante',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
    joined_at: new Date().toISOString().slice(0, 10),
    socials: '',
    bike: 'Por registrar',
    routes: 0,
    km: 0
  } }));
  return user;
}

export async function loginMember({ email, password }) {
  const user = supabaseEnabled
    ? first(await supabaseRequest('members', { query: `?select=*&email=eq.${encodeURIComponent(email)}&limit=1` }))
    : db.users.find((item) => item.email === email);
  const hash = memberPasswordHash(user);
  const validPassword = hash?.startsWith('$2')
    ? await bcrypt.compare(password, hash)
    : hash === password;
  if (!user || !validPassword) {
    const error = new Error('Credenciales invalidas');
    error.status = 401;
    throw error;
  }
  return user;
}

export async function createRoute(body, user) {
  const route = { id: randomUUID(), createdBy: user.id, ...body };
  if (!supabaseEnabled) {
    db.routes.unshift(route);
    return route;
  }
  return first(await supabaseRequest('routes', { method: 'POST', body: {
    ...route,
    created_by: user.id
  } }));
}

export async function updateRoute(id, body) {
  if (!supabaseEnabled) {
    const index = db.routes.findIndex((route) => route.id === id);
    if (index < 0) return null;
    db.routes[index] = { ...db.routes[index], ...body };
    return db.routes[index];
  }
  return first(await supabaseRequest('routes', { method: 'PATCH', query: `?id=eq.${encodeURIComponent(id)}&select=*`, body }));
}

export async function createPhoto(body, user) {
  const image = await uploadDataUrl(body.image, 'gallery');
  const photo = {
    id: randomUUID(),
    image: image || 'https://images.unsplash.com/photo-1558981852-426c6c22a060?auto=format&fit=crop&w=900&q=80',
    title: body.title || 'Nueva foto biker',
    author: user.nickname,
    moto: body.moto || 'Moto registrada',
    event: body.event || 'Rodada',
    location: body.location || 'Ruta registrada',
    reactions: 0,
    comments: []
  };
  if (!supabaseEnabled) {
    db.gallery.unshift(photo);
    return photo;
  }
  return first(await supabaseRequest('gallery_photos', { method: 'POST', body: photo }));
}

export async function updatePhoto(id, body) {
  const next = { ...body };
  if (next.image) next.image = await uploadDataUrl(next.image, 'gallery');
  if (!supabaseEnabled) {
    const index = db.gallery.findIndex((photo) => photo.id === id);
    if (index < 0) return null;
    db.gallery[index] = { ...db.gallery[index], ...next };
    return db.gallery[index];
  }
  return first(await supabaseRequest('gallery_photos', { method: 'PATCH', query: `?id=eq.${encodeURIComponent(id)}&select=*`, body: next }));
}

export async function reactPhoto(id) {
  if (!supabaseEnabled) {
    const photo = db.gallery.find((item) => item.id === id);
    if (!photo) return null;
    photo.reactions += 1;
    return photo;
  }
  const photo = first(await supabaseRequest('gallery_photos', { query: `?select=*&id=eq.${encodeURIComponent(id)}&limit=1` }));
  if (!photo) return null;
  return first(await supabaseRequest('gallery_photos', { method: 'PATCH', query: `?id=eq.${encodeURIComponent(id)}&select=*`, body: { reactions: Number(photo.reactions || 0) + 1 } }));
}

export async function createBike(body, user) {
  const bike = { id: randomUUID(), ownerId: user.id, votes: 0, ...body };
  if (!supabaseEnabled) {
    db.bikes.unshift(bike);
    return bike;
  }
  return first(await supabaseRequest('bikes', { method: 'POST', body: { ...bike, owner_id: user.id } }));
}

export async function voteBike(id) {
  if (!supabaseEnabled) {
    const bike = db.bikes.find((item) => item.id === id);
    if (!bike) return null;
    bike.votes += 1;
    return bike;
  }
  const bike = first(await supabaseRequest('bikes', { query: `?select=*&id=eq.${encodeURIComponent(id)}&limit=1` }));
  if (!bike) return null;
  return first(await supabaseRequest('bikes', { method: 'PATCH', query: `?id=eq.${encodeURIComponent(id)}&select=*`, body: { votes: Number(bike.votes || 0) + 1 } }));
}

export async function createEvent(body, user) {
  const event = { id: randomUUID(), attendees: [user.nickname], ...body };
  if (!supabaseEnabled) {
    db.events.unshift(event);
    return event;
  }
  return normalizeEvent(first(await supabaseRequest('events', { method: 'POST', body: {
    ...event,
    meeting_point: event.meetingPoint
  } })));
}

export async function attendEvent(id, user) {
  if (!supabaseEnabled) {
    const event = db.events.find((item) => item.id === id);
    if (!event) return null;
    if (!event.attendees.includes(user.nickname)) event.attendees.push(user.nickname);
    return event;
  }
  const event = first(await supabaseRequest('events', { query: `?select=*&id=eq.${encodeURIComponent(id)}&limit=1` }));
  if (!event) return null;
  const attendees = event.attendees || [];
  const nextAttendees = attendees.includes(user.nickname) ? attendees : [...attendees, user.nickname];
  return normalizeEvent(first(await supabaseRequest('events', { method: 'PATCH', query: `?id=eq.${encodeURIComponent(id)}&select=*`, body: { attendees: nextAttendees } })));
}

export { publicUser };
