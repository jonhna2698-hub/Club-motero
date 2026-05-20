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
    km: member.km,
    description: member.description || ''
  };
}

function normalizeBike(bike) {
  if (!bike) return bike;
  return {
    ...bike,
    ownerId: bike.ownerId || bike.owner_id
  };
}

function normalizeEvent(event) {
  if (!event) return event;
  return {
    ...event,
    meetingPoint: event.meetingPoint || event.meeting_point
  };
}

function normalizePost(post) {
  if (!post) return post;
  return {
    ...post,
    readTime: post.readTime || post.read_time
  };
}

function normalizeRoute(route) {
  if (!route) return route;
  return {
    ...route,
    createdBy: route.createdBy || route.created_by
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
  return (await supabaseRequest('routes', { query: '?select=*&order=date.desc' })).map(normalizeRoute);
}

export async function listGallery() {
  if (!supabaseEnabled) return db.gallery;
  return supabaseRequest('gallery_photos', { query: '?select=*&order=created_at.desc' });
}

export async function listBikes() {
  if (!supabaseEnabled) return db.bikes;
  return (await supabaseRequest('bikes', { query: '?select=*&order=votes.desc' })).map(normalizeBike);
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
  return (await supabaseRequest('posts', { query: '?select=*&order=created_at.desc' })).map(normalizePost);
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
  const { createdBy: _createdBy, ...payload } = route;
  return normalizeRoute(first(await supabaseRequest('routes', { method: 'POST', body: {
    ...payload,
    created_by: user.id
  } })));
}

export async function updateRoute(id, body) {
  const { id: _id, createdBy: _createdBy, created_at: _createdAt, ...payload } = body;
  if (!supabaseEnabled) {
    const index = db.routes.findIndex((route) => route.id === id);
    if (index < 0) return null;
    db.routes[index] = { ...db.routes[index], ...payload };
    return db.routes[index];
  }
  return normalizeRoute(first(await supabaseRequest('routes', { method: 'PATCH', query: `?id=eq.${encodeURIComponent(id)}&select=*`, body: payload })));
}

export async function deleteRoute(id) {
  if (!supabaseEnabled) {
    const index = db.routes.findIndex((route) => route.id === id);
    if (index < 0) return false;
    db.routes.splice(index, 1);
    return true;
  }
  await supabaseRequest('routes', { method: 'DELETE', query: `?id=eq.${encodeURIComponent(id)}`, prefer: 'return=minimal' });
  return true;
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
  const { id: _id, created_at: _createdAt, ...next } = body;
  if (next.image) next.image = await uploadDataUrl(next.image, 'gallery');
  if (!supabaseEnabled) {
    const index = db.gallery.findIndex((photo) => photo.id === id);
    if (index < 0) return null;
    db.gallery[index] = { ...db.gallery[index], ...next };
    return db.gallery[index];
  }
  return first(await supabaseRequest('gallery_photos', { method: 'PATCH', query: `?id=eq.${encodeURIComponent(id)}&select=*`, body: next }));
}

export async function deletePhoto(id) {
  if (!supabaseEnabled) {
    const index = db.gallery.findIndex((photo) => photo.id === id);
    if (index < 0) return false;
    db.gallery.splice(index, 1);
    return true;
  }
  await supabaseRequest('gallery_photos', { method: 'DELETE', query: `?id=eq.${encodeURIComponent(id)}`, prefer: 'return=minimal' });
  return true;
}

export async function commentPhoto(id, body, user) {
  const comment = {
    id: randomUUID(),
    author: user.nickname,
    text: String(body.text || '').trim(),
    createdAt: new Date().toISOString()
  };
  if (!comment.text) {
    const error = new Error('Comentario requerido');
    error.status = 400;
    throw error;
  }
  if (!supabaseEnabled) {
    const photo = db.gallery.find((item) => item.id === id);
    if (!photo) return null;
    photo.comments = [...(photo.comments || []), comment];
    return photo;
  }
  const photo = first(await supabaseRequest('gallery_photos', { query: `?select=*&id=eq.${encodeURIComponent(id)}&limit=1` }));
  if (!photo) return null;
  const comments = [...(photo.comments || []), comment];
  return first(await supabaseRequest('gallery_photos', { method: 'PATCH', query: `?id=eq.${encodeURIComponent(id)}&select=*`, body: { comments } }));
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
  const { ownerId: _ownerId, ...payload } = bike;
  return normalizeBike(first(await supabaseRequest('bikes', { method: 'POST', body: { ...payload, owner_id: user.id } })));
}

export async function updateBike(id, body) {
  const { id: _id, ownerId: _ownerId, created_at: _createdAt, ...payload } = body;
  if (!supabaseEnabled) {
    const index = db.bikes.findIndex((bike) => bike.id === id);
    if (index < 0) return null;
    db.bikes[index] = { ...db.bikes[index], ...payload };
    return db.bikes[index];
  }
  return normalizeBike(first(await supabaseRequest('bikes', { method: 'PATCH', query: `?id=eq.${encodeURIComponent(id)}&select=*`, body: payload })));
}

export async function deleteBike(id) {
  if (!supabaseEnabled) {
    const index = db.bikes.findIndex((bike) => bike.id === id);
    if (index < 0) return false;
    db.bikes.splice(index, 1);
    return true;
  }
  await supabaseRequest('bikes', { method: 'DELETE', query: `?id=eq.${encodeURIComponent(id)}`, prefer: 'return=minimal' });
  return true;
}

export async function setFeaturedBike(id) {
  if (!supabaseEnabled) {
    db.bikes.forEach((bike) => { bike.featured = bike.id === id; });
    return db.bikes.find((bike) => bike.id === id) || null;
  }
  await supabaseRequest('bikes', { method: 'PATCH', query: '?featured=eq.true', body: { featured: false }, prefer: 'return=minimal' });
  return normalizeBike(first(await supabaseRequest('bikes', { method: 'PATCH', query: `?id=eq.${encodeURIComponent(id)}&select=*`, body: { featured: true } })));
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
  return normalizeBike(first(await supabaseRequest('bikes', { method: 'PATCH', query: `?id=eq.${encodeURIComponent(id)}&select=*`, body: { votes: Number(bike.votes || 0) + 1 } })));
}

export async function createEvent(body, user) {
  const event = { id: randomUUID(), attendees: [user.nickname], ...body };
  if (!supabaseEnabled) {
    db.events.unshift(event);
    return event;
  }
  const { meetingPoint, ...payload } = event;
  return normalizeEvent(first(await supabaseRequest('events', { method: 'POST', body: {
    ...payload,
    meeting_point: event.meetingPoint
  } })));
}

export async function updateEvent(id, body) {
  const { id: _id, created_at: _createdAt, ...basePayload } = body;
  if (!supabaseEnabled) {
    const index = db.events.findIndex((event) => event.id === id);
    if (index < 0) return null;
    db.events[index] = { ...db.events[index], ...basePayload };
    return db.events[index];
  }
  const payload = { ...basePayload };
  if (payload.meetingPoint) {
    payload.meeting_point = payload.meetingPoint;
    delete payload.meetingPoint;
  }
  return normalizeEvent(first(await supabaseRequest('events', { method: 'PATCH', query: `?id=eq.${encodeURIComponent(id)}&select=*`, body: payload })));
}

export async function deleteEvent(id) {
  if (!supabaseEnabled) {
    const index = db.events.findIndex((event) => event.id === id);
    if (index < 0) return false;
    db.events.splice(index, 1);
    return true;
  }
  await supabaseRequest('events', { method: 'DELETE', query: `?id=eq.${encodeURIComponent(id)}`, prefer: 'return=minimal' });
  return true;
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

export async function createPost(body, user) {
  const post = {
    id: randomUUID(),
    title: body.title,
    author: user.nickname,
    category: body.category || 'Experiencias',
    excerpt: body.excerpt || '',
    image: await uploadDataUrl(body.image, 'posts'),
    readTime: body.readTime || body.read_time || '4 min'
  };
  if (!supabaseEnabled) {
    db.posts.unshift(post);
    return post;
  }
  const { readTime, ...payload } = post;
  return normalizePost(first(await supabaseRequest('posts', { method: 'POST', body: { ...payload, read_time: readTime } })));
}

export async function updatePost(id, body) {
  const { id: _id, created_at: _createdAt, ...payload } = body;
  if (payload.image) payload.image = await uploadDataUrl(payload.image, 'posts');
  if (payload.readTime) {
    payload.read_time = payload.readTime;
    delete payload.readTime;
  }
  if (!supabaseEnabled) {
    const index = db.posts.findIndex((post) => post.id === id);
    if (index < 0) return null;
    db.posts[index] = { ...db.posts[index], ...body };
    return db.posts[index];
  }
  return normalizePost(first(await supabaseRequest('posts', { method: 'PATCH', query: `?id=eq.${encodeURIComponent(id)}&select=*`, body: payload })));
}

export async function deletePost(id) {
  if (!supabaseEnabled) {
    const index = db.posts.findIndex((post) => post.id === id);
    if (index < 0) return false;
    db.posts.splice(index, 1);
    return true;
  }
  await supabaseRequest('posts', { method: 'DELETE', query: `?id=eq.${encodeURIComponent(id)}`, prefer: 'return=minimal' });
  return true;
}

export async function updateMember(id, body, requester) {
  if (requester.id !== id && !['fundador', 'administrador', 'moderador'].includes(requester.role)) {
    const error = new Error('No autorizado');
    error.status = 403;
    throw error;
  }
  const payload = { ...body };
  if (payload.avatar) payload.avatar = await uploadDataUrl(payload.avatar, 'avatars');
  if (payload.joinedAt) {
    payload.joined_at = payload.joinedAt;
    delete payload.joinedAt;
  }
  delete payload.email;
  delete payload.password;
  delete payload.id;
  delete payload.created_at;
  if (!['fundador', 'administrador'].includes(requester.role)) delete payload.role;
  if (!supabaseEnabled) {
    const index = db.users.findIndex((member) => member.id === id);
    if (index < 0) return null;
    db.users[index] = { ...db.users[index], ...payload };
    return publicUser(db.users[index]);
  }
  return publicUser(first(await supabaseRequest('members', { method: 'PATCH', query: `?id=eq.${encodeURIComponent(id)}&select=*`, body: payload })));
}

export { publicUser };
