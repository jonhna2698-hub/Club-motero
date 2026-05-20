import jwt from 'jsonwebtoken';
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
} from '../../server/store.js';

const JWT_SECRET = process.env.JWT_SECRET || 'netlify-dev-secret-change-me';

export const config = {
  path: '/api/*'
};

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS'
    }
  });
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

function requireUser(request) {
  const user = getAuthUser(request);
  if (!user) {
    const error = new Error('Token requerido');
    error.status = 401;
    throw error;
  }
  return user;
}

function requireAdmin(user) {
  if (!['fundador', 'administrador', 'moderador'].includes(user.role)) {
    const error = new Error('Permiso requerido');
    error.status = 403;
    throw error;
  }
}

export default async function handler(request) {
  try {
    if (request.method === 'OPTIONS') return json({});

    const path = getApiPath(request);
    const method = request.method;

    if (method === 'GET' && path === '/health') return json(await getHealth());
    if (method === 'GET' && path === '/stats') return json(await getStats());
    if (method === 'GET' && path === '/routes') return json(await listRoutes());
    if (method === 'GET' && path === '/gallery') return json(await listGallery());
    if (method === 'GET' && path === '/bikes') return json(await listBikes());
    if (method === 'GET' && path === '/members') return json(await listMembers());
    if (method === 'GET' && path === '/events') return json(await listEvents());
    if (method === 'GET' && path === '/posts') return json(await listPosts());

    if (method === 'POST' && path === '/auth/register') {
      const user = await registerMember(await readBody(request));
      return json({ token: signUser(user), user: publicUser(user) }, 201);
    }

    if (method === 'POST' && path === '/auth/login') {
      const user = await loginMember(await readBody(request));
      return json({ token: signUser(user), user: publicUser(user) });
    }

    if (method === 'POST' && path === '/routes') return json(await createRoute(await readBody(request), requireUser(request)), 201);

    const routePatch = path.match(/^\/routes\/([^/]+)$/);
    if (method === 'PATCH' && routePatch) {
      requireUser(request);
      const route = await updateRoute(routePatch[1], await readBody(request));
      return route ? json(route) : json({ message: 'Ruta no encontrada' }, 404);
    }
    if (method === 'DELETE' && routePatch) {
      requireAdmin(requireUser(request));
      await deleteRoute(routePatch[1]);
      return json({ ok: true });
    }

    if (method === 'POST' && path === '/gallery') return json(await createPhoto(await readBody(request), requireUser(request)), 201);

    const galleryPatch = path.match(/^\/gallery\/([^/]+)$/);
    if (method === 'PATCH' && galleryPatch) {
      requireUser(request);
      const photo = await updatePhoto(galleryPatch[1], await readBody(request));
      return photo ? json(photo) : json({ message: 'Foto no encontrada' }, 404);
    }
    if (method === 'DELETE' && galleryPatch) {
      requireUser(request);
      await deletePhoto(galleryPatch[1]);
      return json({ ok: true });
    }

    const galleryComment = path.match(/^\/gallery\/([^/]+)\/comments$/);
    if (method === 'POST' && galleryComment) {
      const photo = await commentPhoto(galleryComment[1], await readBody(request), requireUser(request));
      return photo ? json(photo, 201) : json({ message: 'Foto no encontrada' }, 404);
    }

    const galleryReact = path.match(/^\/gallery\/([^/]+)\/react$/);
    if (method === 'POST' && galleryReact) {
      const photo = await reactPhoto(galleryReact[1], requireUser(request));
      return photo ? json(photo) : json({ message: 'Foto no encontrada' }, 404);
    }

    if (method === 'POST' && path === '/bikes') return json(await createBike(await readBody(request), requireUser(request)), 201);

    const bikePatch = path.match(/^\/bikes\/([^/]+)$/);
    if (method === 'PATCH' && bikePatch) {
      requireUser(request);
      const bike = await updateBike(bikePatch[1], await readBody(request));
      return bike ? json(bike) : json({ message: 'Moto no encontrada' }, 404);
    }
    if (method === 'DELETE' && bikePatch) {
      requireAdmin(requireUser(request));
      await deleteBike(bikePatch[1]);
      return json({ ok: true });
    }

    const bikeVote = path.match(/^\/bikes\/([^/]+)\/vote$/);
    if (method === 'POST' && bikeVote) {
      const bike = await voteBike(bikeVote[1]);
      return bike ? json(bike) : json({ message: 'Moto no encontrada' }, 404);
    }

    const bikeFeatured = path.match(/^\/bikes\/([^/]+)\/featured$/);
    if (method === 'POST' && bikeFeatured) {
      requireAdmin(requireUser(request));
      const bike = await setFeaturedBike(bikeFeatured[1]);
      return bike ? json(bike) : json({ message: 'Moto no encontrada' }, 404);
    }

    if (method === 'POST' && path === '/events') return json(await createEvent(await readBody(request), requireUser(request)), 201);

    const eventAttend = path.match(/^\/events\/([^/]+)\/attend$/);
    if (method === 'POST' && eventAttend) {
      const event = await attendEvent(eventAttend[1], requireUser(request));
      return event ? json(event) : json({ message: 'Evento no encontrado' }, 404);
    }

    const eventPatch = path.match(/^\/events\/([^/]+)$/);
    if (method === 'PATCH' && eventPatch) {
      requireAdmin(requireUser(request));
      const event = await updateEvent(eventPatch[1], await readBody(request));
      return event ? json(event) : json({ message: 'Evento no encontrado' }, 404);
    }
    if (method === 'DELETE' && eventPatch) {
      requireAdmin(requireUser(request));
      await deleteEvent(eventPatch[1]);
      return json({ ok: true });
    }

    if (method === 'POST' && path === '/posts') return json(await createPost(await readBody(request), requireUser(request)), 201);

    const postPatch = path.match(/^\/posts\/([^/]+)$/);
    if (method === 'PATCH' && postPatch) {
      requireUser(request);
      const post = await updatePost(postPatch[1], await readBody(request));
      return post ? json(post) : json({ message: 'Post no encontrado' }, 404);
    }
    if (method === 'DELETE' && postPatch) {
      requireAdmin(requireUser(request));
      await deletePost(postPatch[1]);
      return json({ ok: true });
    }

    const memberPatch = path.match(/^\/members\/([^/]+)$/);
    if (method === 'PATCH' && memberPatch) {
      const member = await updateMember(memberPatch[1], await readBody(request), requireUser(request));
      return member ? json(member) : json({ message: 'Miembro no encontrado' }, 404);
    }

    if (method === 'GET' && path === '/admin/overview') {
      const user = requireUser(request);
      if (!['fundador', 'administrador', 'moderador'].includes(user.role)) {
        return json({ message: 'Permiso requerido' }, 403);
      }
      return json(await getAdminOverview());
    }

    return json({ message: `Endpoint no encontrado: ${method} ${path}` }, 404);
  } catch (error) {
    return json({ message: error.message || 'Error interno' }, error.status || 500);
  }
}
