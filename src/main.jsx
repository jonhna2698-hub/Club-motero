import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bike,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  CloudSun,
  Edit3,
  Gauge,
  Heart,
  Lock,
  LogIn,
  LogOut,
  MapPin,
  Medal,
  Menu,
  MessageCircle,
  Moon,
  Plus,
  Route,
  Shield,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  Upload,
  User,
  Users,
  X,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './styles.css';

const API = '/api';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const nav = [
  ['inicio', 'Inicio'],
  ['rutas', 'Rutas'],
  ['galeria', 'Galeria'],
  ['motos', 'Motos'],
  ['miembros', 'Miembros'],
  ['eventos', 'Eventos'],
  ['blog', 'Blog'],
  ['admin', 'Admin']
];

async function getJson(path) {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) throw new Error(`Error cargando ${path}`);
  return response.json();
}

async function sendJson(path, options = {}) {
  const { token, headers, ...requestOptions } = options;
  const response = await fetch(`${API}${path}`, {
    ...requestOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {})
    }
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || 'Error de API');
  return payload;
}

function readImageFile(file, maxMb = 5) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    if (!file.type.startsWith('image/')) return reject(new Error('Selecciona una imagen valida.'));
    if (file.size > maxMb * 1024 * 1024) return reject(new Error(`La imagen no debe superar ${maxMb} MB.`));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}

function validPoint(point) {
  return Array.isArray(point)
    && point.length === 2
    && Number.isFinite(Number(point[0]))
    && Number.isFinite(Number(point[1]));
}

function cleanPoints(points) {
  return (Array.isArray(points) ? points : []).filter(validPoint).map((point) => [Number(point[0]), Number(point[1])]);
}

async function calculateRoadRoute(points) {
  const waypoints = cleanPoints(points);
  if (waypoints.length < 2) {
    throw new Error('Marca al menos inicio y destino.');
  }

  const coordinates = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`);
  const payload = await response.json();
  const route = payload.routes?.[0];

  if (!response.ok || !route) {
    throw new Error('No se pudo calcular la ruta por carretera.');
  }

  return {
    points: route.geometry.coordinates.map(([lng, lat]) => [Number(lat.toFixed(6)), Number(lng.toFixed(6))]),
    distance: Math.max(1, Math.round(route.distance / 1000)),
    duration: `${Math.max(1, Math.round(route.duration / 60))} min`
  };
}

function useClubData() {
  const [data, setData] = useState({
    stats: null,
    routes: [],
    gallery: [],
    bikes: [],
    members: [],
    events: [],
    posts: []
  });

  useEffect(() => {
    Promise.all([
      getJson('/stats'),
      getJson('/routes'),
      getJson('/gallery'),
      getJson('/bikes'),
      getJson('/members'),
      getJson('/events'),
      getJson('/posts')
    ]).then(([stats, routes, gallery, bikes, members, events, posts]) => {
      setData({ stats, routes, gallery, bikes, members, events, posts });
    });
  }, []);

  return { data, setData };
}

function App() {
  const { data, setData } = useClubData();
  const [activeRoute, setActiveRoute] = useState('todas');
  const [activeDifficulty, setActiveDifficulty] = useState('todas');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem('ryp-auth');
    return saved ? JSON.parse(saved) : null;
  });
  const [authOpen, setAuthOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [editingRoute, setEditingRoute] = useState(null);
  const [editingBike, setEditingBike] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [notice, setNotice] = useState('');
  const isAdmin = ['fundador', 'administrador', 'moderador'].includes(auth?.user?.role);

  function showNotice(message) {
    setNotice(message);
    setTimeout(() => setNotice(''), 2600);
  }

  function logout() {
    localStorage.removeItem('ryp-auth');
    setAuth(null);
    showNotice('Sesion cerrada');
  }

  const filteredRoutes = useMemo(() => {
    return data.routes.filter((route) => {
      const routeMatch = activeRoute === 'todas' || route.type === activeRoute;
      const diffMatch = activeDifficulty === 'todas' || route.difficulty === activeDifficulty;
      return routeMatch && diffMatch;
    });
  }, [data.routes, activeRoute, activeDifficulty]);

  return (
    <div className="app-shell">
      <Header
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        auth={auth}
        onLogin={() => setAuthOpen(true)}
        onLogout={logout}
        onProfile={() => setEditingMember(auth?.user)}
      />
      <main>
        <Hero
          stats={data.stats}
          routes={data.routes}
          gallery={data.gallery}
          events={data.events}
          auth={auth}
          onJoin={() => setAuthOpen(true)}
        />
        <RoutesMap
          routes={filteredRoutes}
          activeRoute={activeRoute}
          setActiveRoute={setActiveRoute}
          activeDifficulty={activeDifficulty}
          setActiveDifficulty={setActiveDifficulty}
          onEditRoute={(route) => auth ? setEditingRoute(route) : setAuthOpen(true)}
          onCreateRoute={() => {
            if (!auth) return setAuthOpen(true);
            setEditingRoute({ id: null, name: '', type: 'costera', date: new Date().toISOString().slice(0, 10), distance: 0, duration: '2h', participants: 1, difficulty: 'facil', weather: '', description: '', start: [], points: [], photos: [], comments: [] });
          }}
          isAdmin={isAdmin}
        />
        <Gallery
          gallery={data.gallery}
          onUpload={() => {
            if (!auth) return setAuthOpen(true);
            setUploadOpen(true);
          }}
          onReact={(id) => {
            sendJson(`/gallery/${id}/react`, { method: 'POST' })
              .then((updatedPhoto) => {
                setData((current) => ({
                  ...current,
                  gallery: current.gallery.map((photo) => photo.id === id ? updatedPhoto : photo)
                }));
              })
              .catch(() => {
                setData((current) => ({
                  ...current,
                  gallery: current.gallery.map((photo) => photo.id === id ? { ...photo, reactions: photo.reactions + 1 } : photo)
                }));
              });
          }}
          onEdit={setEditingPhoto}
          onOpen={setViewingPhoto}
          activeAuth={auth}
        />
        <Bikes
          bikes={data.bikes}
          auth={auth}
          isAdmin={isAdmin}
          onCreate={() => {
            if (!auth) return setAuthOpen(true);
            setEditingBike({ id: null, owner: auth.user.nickname, brand: '', model: '', year: new Date().getFullYear(), cc: 0, color: '', type: 'naked', speed: '', consumption: '', mods: '', description: '', image: '', votes: 0, featured: false });
          }}
          onEdit={setEditingBike}
          onDelete={(bike) => {
            if (!isAdmin) return showNotice('Solo admin puede eliminar motos');
            sendJson(`/bikes/${bike.id}`, { method: 'DELETE', token: auth.token }).then(() => {
              setData((current) => ({ ...current, bikes: current.bikes.filter((item) => item.id !== bike.id) }));
              showNotice('Moto eliminada');
            }).catch((error) => showNotice(error.message));
          }}
          onFeatured={(bike) => {
            if (!isAdmin) return showNotice('Solo admin puede elegir moto del mes');
            sendJson(`/bikes/${bike.id}/featured`, { method: 'POST', token: auth.token }).then((updatedBike) => {
              setData((current) => ({ ...current, bikes: current.bikes.map((item) => ({ ...item, featured: item.id === updatedBike.id })) }));
              showNotice('Moto del mes actualizada');
            }).catch((error) => showNotice(error.message));
          }}
          onVote={(id) => {
            sendJson(`/bikes/${id}/vote`, { method: 'POST' })
              .then((updatedBike) => {
                setData((current) => ({
                  ...current,
                  bikes: current.bikes.map((bike) => bike.id === id ? updatedBike : bike)
                }));
              })
              .catch(() => {
                setData((current) => ({
                  ...current,
                  bikes: current.bikes.map((bike) => bike.id === id ? { ...bike, votes: bike.votes + 1 } : bike)
                }));
              });
          }}
        />
        <Members
          members={data.members}
          auth={auth}
          isAdmin={isAdmin}
          onEdit={(member) => {
            if (!auth) return setAuthOpen(true);
            if (auth.user.id !== member.id && !isAdmin) return showNotice('Solo puedes editar tu perfil');
            setEditingMember(member);
          }}
        />
        <Events
          events={data.events}
          auth={auth}
          isAdmin={isAdmin}
          onCreate={() => {
            if (!isAdmin) return showNotice('Solo admin puede crear eventos');
            setEditingEvent({ id: null, title: '', date: new Date().toISOString().slice(0, 16), meetingPoint: '', weather: '', recommendations: [], attendees: [], map: [-12.0464, -77.0428] });
          }}
          onEdit={setEditingEvent}
          onDelete={(event) => {
            if (!isAdmin) return showNotice('Solo admin puede eliminar eventos');
            sendJson(`/events/${event.id}`, { method: 'DELETE', token: auth.token }).then(() => {
              setData((current) => ({ ...current, events: current.events.filter((item) => item.id !== event.id) }));
              showNotice('Evento eliminado');
            }).catch((error) => showNotice(error.message));
          }}
          onAttend={(id) => {
            if (!auth) return setAuthOpen(true);
            sendJson(`/events/${id}/attend`, { method: 'POST', token: auth.token })
              .then((updatedEvent) => {
                setData((current) => ({
                  ...current,
                  events: current.events.map((event) => event.id === id ? updatedEvent : event)
                }));
              })
              .catch(() => {
                setData((current) => ({
                  ...current,
                  events: current.events.map((event) => {
                    if (event.id !== id || event.attendees.includes(auth.user.nickname)) return event;
                    return { ...event, attendees: [...event.attendees, auth.user.nickname] };
                  })
                }));
              });
          }}
        />
        <Blog
          posts={data.posts}
          auth={auth}
          isAdmin={isAdmin}
          onCreate={() => {
            if (!auth) return setAuthOpen(true);
            setEditingPost({ id: null, title: '', category: 'Experiencias', excerpt: '', image: '', readTime: '4 min' });
          }}
          onEdit={setEditingPost}
          onDelete={(post) => {
            if (!isAdmin) return showNotice('Solo admin puede eliminar posts');
            sendJson(`/posts/${post.id}`, { method: 'DELETE', token: auth.token }).then(() => {
              setData((current) => ({ ...current, posts: current.posts.filter((item) => item.id !== post.id) }));
              showNotice('Publicacion eliminada');
            }).catch((error) => showNotice(error.message));
          }}
        />
        <Achievements members={data.members} stats={data.stats} bikes={data.bikes} />
        <AdminPanel stats={data.stats} members={data.members} gallery={data.gallery} routes={data.routes} events={data.events} isAdmin={isAdmin} />
      </main>
      {notice && <div className="toast">{notice}</div>}
      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onAuth={(session) => {
            localStorage.setItem('ryp-auth', JSON.stringify(session));
            setAuth(session);
            setAuthOpen(false);
            showNotice(`Sesion iniciada como ${session.user.nickname}`);
          }}
        />
      )}
      {uploadOpen && (
        <UploadPhotoModal
          token={auth?.token}
          onClose={() => setUploadOpen(false)}
          onUploaded={(photo) => {
            setData((current) => ({ ...current, gallery: [photo, ...current.gallery] }));
            setUploadOpen(false);
            showNotice('Foto subida a la galeria');
          }}
        />
      )}
      {editingPhoto && (
        <EditPhotoModal
          photo={editingPhoto}
          onClose={() => setEditingPhoto(null)}
          onSave={(updatedPhoto) => {
            sendJson(`/gallery/${updatedPhoto.id}`, {
              method: 'PATCH',
              token: auth?.token,
              body: JSON.stringify(updatedPhoto)
            }).then((savedPhoto) => {
              setData((current) => ({
                ...current,
                gallery: current.gallery.map((photo) => photo.id === savedPhoto.id ? savedPhoto : photo)
              }));
              setViewingPhoto((current) => current?.id === savedPhoto.id ? savedPhoto : current);
              setEditingPhoto(null);
              showNotice('Foto actualizada');
            }).catch((error) => showNotice(error.message));
          }}
        />
      )}
      {viewingPhoto && (
        <PhotoLightbox
          photo={viewingPhoto}
          auth={auth}
          onClose={() => setViewingPhoto(null)}
          onEdit={() => setEditingPhoto(viewingPhoto)}
          onDelete={() => {
            if (!auth) return setAuthOpen(true);
            sendJson(`/gallery/${viewingPhoto.id}`, { method: 'DELETE', token: auth.token }).then(() => {
              setData((current) => ({ ...current, gallery: current.gallery.filter((photo) => photo.id !== viewingPhoto.id) }));
              setViewingPhoto(null);
              showNotice('Foto eliminada');
            }).catch((error) => showNotice(error.message));
          }}
          onComment={(text) => {
            if (!auth) return setAuthOpen(true);
            sendJson(`/gallery/${viewingPhoto.id}/comments`, { method: 'POST', token: auth.token, body: JSON.stringify({ text }) }).then((savedPhoto) => {
              setData((current) => ({ ...current, gallery: current.gallery.map((photo) => photo.id === savedPhoto.id ? savedPhoto : photo) }));
              setViewingPhoto(savedPhoto);
            }).catch((error) => showNotice(error.message));
          }}
        />
      )}
      {editingRoute && (
        <EditRouteModal
          route={editingRoute}
          onClose={() => setEditingRoute(null)}
          onSave={(updatedRoute) => {
            const creating = !updatedRoute.id;
            sendJson(creating ? '/routes' : `/routes/${updatedRoute.id}`, {
              method: creating ? 'POST' : 'PATCH',
              token: auth?.token,
              body: JSON.stringify(updatedRoute)
            }).then((savedRoute) => {
              setData((current) => ({
                ...current,
                routes: creating ? [savedRoute, ...current.routes] : current.routes.map((route) => route.id === savedRoute.id ? savedRoute : route)
              }));
              setEditingRoute(null);
              showNotice(creating ? 'Ruta creada' : 'Ruta actualizada');
            }).catch((error) => showNotice(error.message));
          }}
          onDelete={(route) => {
            if (!isAdmin || !route.id) return showNotice('Solo admin puede eliminar rutas');
            sendJson(`/routes/${route.id}`, { method: 'DELETE', token: auth.token }).then(() => {
              setData((current) => ({ ...current, routes: current.routes.filter((item) => item.id !== route.id) }));
              setEditingRoute(null);
              showNotice('Ruta eliminada');
            }).catch((error) => showNotice(error.message));
          }}
        />
      )}
      {editingBike && (
        <BikeModal
          bike={editingBike}
          onClose={() => setEditingBike(null)}
          onSave={(bike) => {
            const creating = !bike.id;
            sendJson(creating ? '/bikes' : `/bikes/${bike.id}`, { method: creating ? 'POST' : 'PATCH', token: auth?.token, body: JSON.stringify(bike) }).then((savedBike) => {
              setData((current) => ({ ...current, bikes: creating ? [savedBike, ...current.bikes] : current.bikes.map((item) => item.id === savedBike.id ? savedBike : item) }));
              setEditingBike(null);
              showNotice(creating ? 'Moto creada' : 'Moto actualizada');
            }).catch((error) => showNotice(error.message));
          }}
        />
      )}
      {editingEvent && (
        <EventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={(event) => {
            const creating = !event.id;
            sendJson(creating ? '/events' : `/events/${event.id}`, { method: creating ? 'POST' : 'PATCH', token: auth?.token, body: JSON.stringify(event) }).then((savedEvent) => {
              setData((current) => ({ ...current, events: creating ? [savedEvent, ...current.events] : current.events.map((item) => item.id === savedEvent.id ? savedEvent : item) }));
              setEditingEvent(null);
              showNotice(creating ? 'Evento creado' : 'Evento actualizado');
            }).catch((error) => showNotice(error.message));
          }}
        />
      )}
      {editingPost && (
        <PostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSave={(post) => {
            const creating = !post.id;
            sendJson(creating ? '/posts' : `/posts/${post.id}`, { method: creating ? 'POST' : 'PATCH', token: auth?.token, body: JSON.stringify(post) }).then((savedPost) => {
              setData((current) => ({ ...current, posts: creating ? [savedPost, ...current.posts] : current.posts.map((item) => item.id === savedPost.id ? savedPost : item) }));
              setEditingPost(null);
              showNotice(creating ? 'Publicacion creada' : 'Publicacion actualizada');
            }).catch((error) => showNotice(error.message));
          }}
        />
      )}
      {editingMember && (
        <ProfileModal
          member={editingMember}
          isAdmin={isAdmin}
          onClose={() => setEditingMember(null)}
          onSave={(member) => {
            sendJson(`/members/${member.id}`, { method: 'PATCH', token: auth?.token, body: JSON.stringify(member) }).then((savedMember) => {
              setData((current) => ({ ...current, members: current.members.map((item) => item.id === savedMember.id ? savedMember : item) }));
              if (auth?.user?.id === savedMember.id) {
                const session = { ...auth, user: savedMember };
                localStorage.setItem('ryp-auth', JSON.stringify(session));
                setAuth(session);
              }
              setEditingMember(null);
              showNotice('Perfil actualizado');
            }).catch((error) => showNotice(error.message));
          }}
        />
      )}
      <Footer />
    </div>
  );
}

function Header({ mobileOpen, setMobileOpen, auth, onLogin, onLogout, onProfile }) {
  return (
    <header className="topbar">
      <a className="brand" href="#inicio" aria-label="Rapidos y Precoces">
        <span className="brand-mark"><Zap size={19} /></span>
        <span>
          <strong>Rapidos y Precoces</strong>
          <small>Club Motero</small>
        </span>
      </a>
      <nav className="desktop-nav">
        {nav.map(([id, label]) => (
          <a key={id} href={`#${id}`}>{label}</a>
        ))}
      </nav>
      <div className="session-actions">
        {auth ? (
          <>
            <button className="ghost-button small" onClick={onProfile}><User size={16} /> {auth.user.nickname}</button>
            <button className="icon-button" onClick={onLogout} aria-label="Cerrar sesion"><LogOut size={18} /></button>
          </>
        ) : (
          <button className="ghost-button small" onClick={onLogin}><LogIn size={16} /> Entrar</button>
        )}
      </div>
      <button className="icon-button menu-button" onClick={() => setMobileOpen((value) => !value)} aria-label="Abrir menu">
        {mobileOpen ? <X /> : <Menu />}
      </button>
      {mobileOpen && (
        <nav className="mobile-nav">
          {nav.map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={() => setMobileOpen(false)}>{label}</a>
          ))}
          {auth ? (
            <>
              <button className="ghost-button small" onClick={onProfile}><User size={16} /> Perfil</button>
              <button className="ghost-button small" onClick={onLogout}><LogOut size={16} /> Salir</button>
            </>
          ) : (
            <button className="ghost-button small" onClick={onLogin}><LogIn size={16} /> Entrar</button>
          )}
        </nav>
      )}
    </header>
  );
}

function Hero({ stats, routes, gallery, events, auth, onJoin }) {
  return (
    <section id="inicio" className="hero">
      <div className="hero-media" />
      <div className="hero-overlay" />
      <motion.div
        className="hero-content"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="eyebrow"><Sparkles size={16} /> Comunidad biker digital</div>
        <h1>Rapidos y Precoces</h1>
        <p className="hero-copy">
          Rodamos como hermandad, registramos cada ruta y convertimos cada kilometro en memoria visual.
        </p>
        <div className="hero-actions">
          <a className="primary-button" href="#rutas">Ver rutas <ChevronRight size={18} /></a>
          <a className="ghost-button" href="#motos">Explorar motos</a>
          <button className="ghost-button" onClick={onJoin}>
            {auth ? `Hola, ${auth.user.nickname}` : 'Unirme al club'}
          </button>
        </div>
      </motion.div>
      <div className="stats-strip">
        <Stat label="Kilometros" value={stats?.kilometers?.toLocaleString('es-PE') || '...'} icon={<Gauge />} />
        <Stat label="Rutas completadas" value={stats?.routes || '...'} icon={<Route />} />
        <Stat label="Miembros activos" value={stats?.members || '...'} icon={<Users />} />
        <Stat label="Motos registradas" value={stats?.bikes || '...'} icon={<Bike />} />
      </div>
      <div className="hero-dock">
        <MiniPanel title="Ultima rodada" text={routes[0]?.name || 'Cargando'} icon={<Route />} />
        <MiniPanel title="Foto destacada" text={gallery[0]?.title || 'Cargando'} icon={<Camera />} />
        <MiniPanel title="Proximo evento" text={events[0]?.title || 'Cargando'} icon={<CalendarDays />} />
      </div>
    </section>
  );
}

function Stat({ label, value, icon }) {
  return (
    <div className="stat-card">
      {icon}
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function MiniPanel({ title, text, icon }) {
  return (
    <article className="mini-panel">
      <span>{icon}</span>
      <div>
        <small>{title}</small>
        <strong>{text}</strong>
      </div>
    </article>
  );
}

function RoutesMap({ routes, activeRoute, setActiveRoute, activeDifficulty, setActiveDifficulty, onEditRoute, onCreateRoute, isAdmin }) {
  const routePoints = routes.flatMap((route) => cleanPoints(route.points));
  const center = routePoints[0] || cleanPoints([routes[0]?.start])[0] || [-12.0464, -77.0428];

  return (
    <section id="rutas" className="section route-section">
      <SectionTitle
        eyebrow="Mapa interactivo"
        title="Rutas, ubicaciones y recuerdos sobre el mapa"
        text="Filtra rodadas por tipo y dificultad, revisa distancia, clima, participantes, fotos y comentarios de cada ubicacion."
      />
      <div className="filter-row">
        {['todas', 'costera', 'montana', 'valle'].map((item) => (
          <button className={activeRoute === item ? 'chip active' : 'chip'} key={item} onClick={() => setActiveRoute(item)}>{item}</button>
        ))}
        {['todas', 'facil', 'intermedia', 'alta'].map((item) => (
          <button className={activeDifficulty === item ? 'chip active danger' : 'chip'} key={item} onClick={() => setActiveDifficulty(item)}>{item}</button>
        ))}
        <button className="primary-button small" onClick={onCreateRoute}><Plus size={16} /> Nueva ruta</button>
      </div>
      <div className="map-layout">
        <div className="map-frame">
          <MapContainer center={center} zoom={8} scrollWheelZoom className="leaflet-map">
            <ResizeMap />
            <FitBounds points={routePoints} />
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {routes.map((route) => (
              <RouteOverlay route={route} key={route.id} />
            ))}
          </MapContainer>
        </div>
        <div className="route-list">
          {routes.map((route) => (
            <article className="route-card" key={route.id}>
              <div>
                <span className="tag">{route.type}</span>
                <h3>{route.name}</h3>
                <p>{route.description}</p>
              </div>
              <button className="edit-button" onClick={() => onEditRoute(route)}><Edit3 size={16} /> {isAdmin ? 'Editar ruta' : 'Ver detalle'}</button>
              <div className="route-meta">
                <span><MapPin size={16} /> {route.distance} km</span>
                <span><CalendarDays size={16} /> {route.date}</span>
                <span><CloudSun size={16} /> {route.weather}</span>
                <span><Users size={16} /> {route.participants} riders</span>
              </div>
              <div className="thumb-row">
                {route.photos.map((photo) => <img key={photo} src={photo} alt={route.name} loading="lazy" />)}
              </div>
              <p className="comment-line"><MessageCircle size={15} /> {route.comments[0]}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FitBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    const clean = cleanPoints(points);
    if (clean.length === 0) return;
    if (clean.length === 1) {
      map.setView(clean[0], 10);
      return;
    }
    map.fitBounds(clean, { padding: [34, 34], maxZoom: 11 });
  }, [map, points]);

  return null;
}

function ResizeMap() {
  const map = useMap();

  useEffect(() => {
    const resize = () => map.invalidateSize();
    const timer = window.setTimeout(resize, 120);
    window.addEventListener('resize', resize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', resize);
    };
  }, [map]);

  return null;
}

function RouteOverlay({ route }) {
  const points = cleanPoints(route.points);
  const start = cleanPoints([route.start])[0] || points[0];
  const markerPoints = points.length > 24 ? [points[0], points[points.length - 1]].filter(Boolean) : points;
  if (points.length === 0 && !start) return null;

  return (
    <React.Fragment>
      {points.length > 1 && <Polyline positions={points} pathOptions={{ color: '#ff243d', weight: 5, opacity: 0.85 }} />}
      {markerPoints.map((point, index) => (
        <Marker position={point} key={`${route.id}-${index}`}>
          <Popup>
            <strong>{route.name}</strong><br />
            {points.length > 24 ? (index === 0 ? 'Inicio' : 'Destino') : `Punto ${index + 1}`} | {route.difficulty}<br />
            {route.weather}
          </Popup>
        </Marker>
      ))}
      {points.length === 0 && start && (
        <Marker position={start}>
          <Popup>
            <strong>{route.name}</strong><br />
            {route.distance} km | {route.difficulty}<br />
            {route.weather}
          </Popup>
        </Marker>
      )}
    </React.Fragment>
  );
}

function Gallery({ gallery, onUpload, onReact, onEdit, onOpen, activeAuth }) {
  const filters = ['todas', 'integrante', 'moto', 'evento', 'ubicacion', 'mis fotos'];
  const [filter, setFilter] = useState('todas');
  const filteredGallery = gallery.filter((photo) => {
    if (filter === 'todas') return true;
    if (filter === 'mis fotos') return activeAuth && photo.author === activeAuth.user.nickname;
    return Boolean(photo[filter === 'integrante' ? 'author' : filter === 'ubicacion' ? 'location' : filter]);
  });
  return (
    <section id="galeria" className="section">
      <SectionTitle
        eyebrow="Galeria social"
        title="Fotos, reacciones y albumes de ruta"
        text="Un grid visual para subir fotos, reaccionar, comentar y filtrar recuerdos por integrante, moto, evento o ubicacion."
      />
      <div className="filter-row compact">
        {filters.map((item) => <button className={filter === item ? 'chip active' : 'chip'} key={item} onClick={() => setFilter(item)}>{item}</button>)}
        <button className="primary-button small" onClick={onUpload}><Upload size={16} /> Subir foto</button>
      </div>
      <div className="gallery-grid">
        {filteredGallery.length === 0 && <EmptyState title="Sin fotos para este filtro" text="Sube una nueva foto o cambia el filtro activo." />}
        {filteredGallery.map((photo, index) => (
          <motion.article className={`photo-card span-${index % 3}`} key={photo.id} whileHover={{ y: -8 }}>
            <button className="photo-open" onClick={() => onOpen(photo)} aria-label={`Abrir ${photo.title}`}>
              <img src={photo.image} alt={photo.title} loading="lazy" />
            </button>
            <div className="photo-info">
              <span>{photo.event}</span>
              <h3>{photo.title}</h3>
              <p>{photo.author} | {photo.location}</p>
              <div>
                <button className="inline-action" onClick={() => onReact(photo.id)}><Heart size={16} /> {photo.reactions}</button>
                <span><MessageCircle size={16} /> {photo.comments.length}</span>
                {activeAuth && <button className="inline-action" onClick={() => onEdit(photo)}><Edit3 size={16} /> Editar</button>}
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function Bikes({ bikes, auth, isAdmin, onCreate, onEdit, onDelete, onFeatured, onVote }) {
  return (
    <section id="motos" className="section">
      <SectionTitle
        eyebrow="Catalogo premium"
        title="Maquinas registradas por la comunidad"
        text="Tarjetas de alto impacto con ficha tecnica, modificaciones, consumo, votos y motos destacadas."
      />
      <div className="filter-row compact">
        <button className="primary-button small" onClick={onCreate}><Plus size={16} /> Registrar moto</button>
      </div>
      <div className="bike-grid">
        {bikes.length === 0 && <EmptyState title="Sin motos registradas" text="Registra la primera maquina del club." />}
        {bikes.map((bike) => (
          <article className={bike.featured ? 'bike-card featured' : 'bike-card'} key={bike.id}>
            <img src={bike.image} alt={`${bike.brand} ${bike.model}`} loading="lazy" />
            <div className="bike-body">
              <div className="split">
                <span className="tag">{bike.type}</span>
                <button className="votes action-link" onClick={() => onVote(bike.id)}><Star size={16} /> {bike.votes}</button>
              </div>
              <h3>{bike.brand} {bike.model}</h3>
              <p>{bike.description}</p>
              <div className="spec-grid">
                <span>{bike.year}<small>Ano</small></span>
                <span>{bike.cc}cc<small>Cilindrada</small></span>
                <span>{bike.speed}<small>Velocidad</small></span>
                <span>{bike.consumption}<small>Consumo</small></span>
              </div>
              <p className="mods">{bike.mods}</p>
              <div className="card-actions">
                {(auth?.user?.nickname === bike.owner || isAdmin) && <button className="ghost-button small" onClick={() => onEdit(bike)}><Edit3 size={16} /> Editar</button>}
                {isAdmin && <button className="ghost-button small" onClick={() => onFeatured(bike)}><Trophy size={16} /> Moto del mes</button>}
                {isAdmin && <button className="danger-button small" onClick={() => onDelete(bike)}><Trash2 size={16} /> Eliminar</button>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Members({ members, auth, isAdmin, onEdit }) {
  return (
    <section id="miembros" className="section">
      <SectionTitle
        eyebrow="Perfiles biker"
        title="Integrantes, roles, kilometros y reputacion"
        text="Cada perfil muestra nickname, moto actual, kilometraje, fecha de ingreso, rol y redes sociales."
      />
      <div className="member-grid">
        {members.length === 0 && <EmptyState title="Sin miembros" text="Los perfiles apareceran aqui cuando se registren." />}
        {members.map((member) => (
          <article className="member-card" key={member.id}>
            <img src={member.avatar} alt={member.nickname} loading="lazy" />
            <div>
              <span className="tag">{member.role}</span>
              <h3>{member.nickname}</h3>
              <p>{member.name} | {member.bike}</p>
              {member.description && <p>{member.description}</p>}
              <div className="member-stats">
                <span>{member.routes}<small>rutas</small></span>
                <span>{member.km?.toLocaleString('es-PE')}<small>km</small></span>
                <span>{member.joinedAt}<small>ingreso</small></span>
              </div>
              {(auth?.user?.id === member.id || isAdmin) && <button className="edit-button" onClick={() => onEdit(member)}><Edit3 size={16} /> Editar perfil</button>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Events({ events, auth, isAdmin, onCreate, onEdit, onDelete, onAttend }) {
  return (
    <section id="eventos" className="section event-section">
      <SectionTitle
        eyebrow="Rodadas y eventos"
        title="Agenda con asistencia, clima y checklist"
        text="Organiza salidas con punto de encuentro, contador, participantes, recomendaciones y mapa del meetup."
      />
      <div className="filter-row compact">
        {isAdmin && <button className="primary-button small" onClick={onCreate}><Plus size={16} /> Crear evento</button>}
      </div>
      <div className="event-grid">
        {events.length === 0 && <EmptyState title="Sin eventos" text="Crea la siguiente rodada del club." />}
        {events.map((event) => <EventCard event={event} auth={auth} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} onAttend={onAttend} key={event.id} />)}
      </div>
    </section>
  );
}

function EventCard({ event, auth, isAdmin, onEdit, onDelete, onAttend }) {
  const hours = Math.max(0, Math.ceil((new Date(event.date) - new Date()) / 36e5));
  const joined = Boolean(auth && event.attendees.includes(auth.user.nickname));
  return (
    <article className="event-card">
      <div className="split">
        <span className="tag">proxima salida</span>
        <span className="countdown">{hours}h</span>
      </div>
      <h3>{event.title}</h3>
      <p><MapPin size={16} /> {event.meetingPoint}</p>
      <p><CloudSun size={16} /> {event.weather}</p>
      <div className="checklist">
        {event.recommendations.map((item) => <span key={item}><CheckCircle2 size={15} /> {item}</span>)}
      </div>
      <div className="event-footer">
        <div className="attendees">{event.attendees.map((item) => <span key={item}>{item[0]}</span>)}</div>
        <button className="primary-button small" onClick={() => onAttend(event.id)} disabled={joined}>
          {joined ? 'Confirmado' : 'Confirmar asistencia'}
        </button>
      </div>
      {isAdmin && (
        <div className="card-actions">
          <button className="ghost-button small" onClick={() => onEdit(event)}><Edit3 size={16} /> Editar</button>
          <button className="danger-button small" onClick={() => onDelete(event)}><Trash2 size={16} /> Eliminar</button>
        </div>
      )}
    </article>
  );
}

function AuthModal({ onClose, onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', nickname: '', email: 'admin@rapidos.test', password: 'admin123' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API}/auth/${mode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'No se pudo autenticar');
      onAuth(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={mode === 'login' ? 'Acceso biker' : 'Registro al club'} onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        {mode === 'register' && (
          <>
            <label>Nombre<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>Nickname biker<input required value={form.nickname} onChange={(event) => setForm({ ...form, nickname: event.target.value })} /></label>
          </>
        )}
        <label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>Contrasena<input required type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" disabled={loading} type="submit"><LogIn size={17} /> {loading ? 'Procesando' : 'Entrar'}</button>
        <button className="text-button" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Crear cuenta nueva' : 'Ya tengo cuenta'}
        </button>
      </form>
    </Modal>
  );
}

function UploadPhotoModal({ token, onClose, onUploaded }) {
  const [form, setForm] = useState({ title: '', moto: '', event: '', location: '' });
  const [image, setImage] = useState('');
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function pickFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    readImageFile(file).then((result) => {
      setImage(result);
      setPreview(result);
      setError('');
    }).catch((err) => setError(err.message));
  }

  async function submit(event) {
    event.preventDefault();
    if (!image) return setError('Debes seleccionar una foto.');
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API}/gallery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...form, image })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'No se pudo subir la foto');
      onUploaded(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Subir foto de ruta" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <label>Titulo<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
        <label>Foto<input required type="file" accept="image/*" onChange={pickFile} /></label>
        {preview && <img className="upload-preview" src={preview} alt="Preview de subida" />}
        <label>Moto<input value={form.moto} onChange={(event) => setForm({ ...form, moto: event.target.value })} /></label>
        <label>Evento<input value={form.event} onChange={(event) => setForm({ ...form, event: event.target.value })} /></label>
        <label>Ubicacion<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" disabled={loading} type="submit"><Upload size={17} /> {loading ? 'Subiendo' : 'Publicar foto'}</button>
      </form>
    </Modal>
  );
}

function EditPhotoModal({ photo, onClose, onSave }) {
  const [form, setForm] = useState({
    title: photo.title,
    location: photo.location,
    moto: photo.moto || '',
    event: photo.event || '',
    image: photo.image
  });
  const [preview, setPreview] = useState(photo.image);
  const [error, setError] = useState('');

  function pickFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    readImageFile(file).then((result) => {
      setForm((current) => ({ ...current, image: result }));
      setPreview(result);
      setError('');
    }).catch((err) => setError(err.message));
  }

  function submit(event) {
    event.preventDefault();
    onSave({ ...photo, ...form });
  }

  return (
    <Modal title="Editar foto" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <label>Nombre de la foto<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
        <label>Ubicacion<input required value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
        <label>Moto<input value={form.moto} onChange={(event) => setForm({ ...form, moto: event.target.value })} /></label>
        <label>Evento<input value={form.event} onChange={(event) => setForm({ ...form, event: event.target.value })} /></label>
        <label>Cambiar imagen<input type="file" accept="image/*" onChange={pickFile} /></label>
        <img className="upload-preview" src={preview} alt={form.title} />
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" type="submit"><Edit3 size={17} /> Guardar cambios</button>
      </form>
    </Modal>
  );
}

function EditRouteModal({ route, onClose, onSave }) {
  const [form, setForm] = useState({
    name: route.name,
    type: route.type,
    date: route.date,
    distance: route.distance,
    duration: route.duration,
    participants: route.participants,
    difficulty: route.difficulty,
    weather: route.weather,
    description: route.description,
    start: cleanPoints([route.start])[0] || [],
    points: cleanPoints(route.points),
    photos: route.photos || [],
    comments: route.comments || []
  });
  const [manualPoint, setManualPoint] = useState({ lat: '', lng: '' });
  const [routeStatus, setRouteStatus] = useState('');
  const hasCalculatedPath = form.points.length > 24;

  function setPoints(points) {
    const nextPoints = cleanPoints(points);
    setRouteStatus('');
    setForm((current) => ({
      ...current,
      points: nextPoints,
      start: nextPoints[0] || []
    }));
  }

  function addManualPoint() {
    const lat = Number(manualPoint.lat);
    const lng = Number(manualPoint.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setPoints([...form.points, [lat, lng]]);
    setManualPoint({ lat: '', lng: '' });
  }

  async function calculatePath() {
    if (hasCalculatedPath) {
      setRouteStatus('Esta ruta ya tiene un trazado calculado. Para cambiarla, limpia los puntos y marca inicio, paradas y destino otra vez.');
      return;
    }
    setRouteStatus('Calculando ruta por carretera...');
    try {
      const roadRoute = await calculateRoadRoute(form.points);
      setForm((current) => ({
        ...current,
        points: roadRoute.points,
        start: roadRoute.points[0] || [],
        distance: roadRoute.distance,
        duration: roadRoute.duration
      }));
      setRouteStatus(`Ruta calculada: ${roadRoute.distance} km aprox. por carretera.`);
    } catch (error) {
      setRouteStatus(error.message || 'No se pudo calcular la ruta.');
    }
  }

  function submit(event) {
    event.preventDefault();
    const points = cleanPoints(form.points);
    onSave({
      ...route,
      ...form,
      distance: Number(form.distance),
      participants: Number(form.participants),
      start: points[0] || [],
      points
    });
  }

  return (
    <Modal title="Editar ruta y ubicacion" onClose={onClose}>
      <form className="modal-form two-columns" onSubmit={submit}>
        <label>Nombre de ruta<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Tipo<input required value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} /></label>
        <label>Fecha<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
        <label>Distancia km<input required type="number" value={form.distance} onChange={(event) => setForm({ ...form, distance: event.target.value })} /></label>
        <label>Duracion<input required value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} /></label>
        <label>Participantes<input required type="number" value={form.participants} onChange={(event) => setForm({ ...form, participants: event.target.value })} /></label>
        <label>Dificultad<input required value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value })} /></label>
        <label>Clima<input required value={form.weather} onChange={(event) => setForm({ ...form, weather: event.target.value })} /></label>
        <label className="wide-field">Descripcion<input required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <div className="wide-field route-editor-map">
          <RoutePointPicker points={form.points} setPoints={setPoints} />
        </div>
        <div className="wide-field coordinate-tools">
          <label>Latitud<input value={manualPoint.lat} onChange={(event) => setManualPoint({ ...manualPoint, lat: event.target.value })} placeholder="-12.0464" /></label>
          <label>Longitud<input value={manualPoint.lng} onChange={(event) => setManualPoint({ ...manualPoint, lng: event.target.value })} placeholder="-77.0428" /></label>
          <button className="ghost-button small" type="button" onClick={addManualPoint}><MapPin size={16} /> Agregar punto</button>
          <button className="primary-button small" type="button" onClick={calculatePath}><Route size={16} /> Calcular por carretera</button>
          <button className="danger-button small" type="button" onClick={() => setPoints([])}><Trash2 size={16} /> Limpiar puntos</button>
        </div>
        {routeStatus && <p className="wide-field route-status">{routeStatus}</p>}
        <div className="wide-field point-list">
          {form.points.length === 0 ? (
            <p>Haz clic en el mapa para marcar inicio, paradas y destino. Luego usa "Calcular por carretera" para seguir la pista real.</p>
          ) : hasCalculatedPath ? (
            <span>
              Ruta por carretera guardada con {form.points.length} puntos. Inicio {form.points[0]?.[0]?.toFixed(5)}, {form.points[0]?.[1]?.toFixed(5)}
              {' '}| destino {form.points[form.points.length - 1]?.[0]?.toFixed(5)}, {form.points[form.points.length - 1]?.[1]?.toFixed(5)}
              <button type="button" onClick={() => setPoints([])}>Limpiar</button>
            </span>
          ) : form.points.map((point, index) => (
            <span key={`${point[0]}-${point[1]}-${index}`}>
              {index + 1}. {point[0].toFixed(5)}, {point[1].toFixed(5)}
              <button type="button" onClick={() => setPoints(form.points.filter((_, pointIndex) => pointIndex !== index))}>Quitar</button>
            </span>
          ))}
        </div>
        <button className="primary-button wide-field" type="submit"><Edit3 size={17} /> Guardar ruta</button>
      </form>
    </Modal>
  );
}

function RoutePointPicker({ points, setPoints }) {
  const clean = cleanPoints(points);
  const center = clean[0] || [-12.0464, -77.0428];
  const markerPoints = clean.length > 24 ? [clean[0], clean[clean.length - 1]].filter(Boolean) : clean;

  return (
    <div>
      <div className="route-editor-help">
        <strong>Elegir ubicaciones</strong>
        <span>Haz clic en el mapa para agregar puntos. El primer punto es el inicio; el ultimo es el destino.</span>
      </div>
      <MapContainer center={center} zoom={9} scrollWheelZoom className="route-picker-map">
        <ResizeMap />
        <FitBounds points={clean} />
        <RouteMapClick onAdd={(point) => setPoints([...clean, point])} />
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {clean.length > 1 && <Polyline positions={clean} pathOptions={{ color: '#ff243d', weight: 5, opacity: 0.9 }} />}
        {markerPoints.map((point, index) => (
          <Marker position={point} key={`${point[0]}-${point[1]}-${index}`}>
            <Popup>{clean.length > 24 ? (index === 0 ? 'Inicio' : 'Destino') : index === 0 ? 'Inicio' : index === clean.length - 1 ? 'Destino' : `Parada ${index}`}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function RouteMapClick({ onAdd }) {
  useMapEvents({
    click(event) {
      onAdd([Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6))]);
    }
  });
  return null;
}

function BikeModal({ bike, onClose, onSave }) {
  const [form, setForm] = useState(bike);
  const [error, setError] = useState('');

  async function pickFile(event) {
    try {
      const image = await readImageFile(event.target.files?.[0]);
      if (image) setForm((current) => ({ ...current, image }));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal title={bike.id ? 'Editar moto' : 'Registrar moto'} onClose={onClose}>
      <form className="modal-form two-columns" onSubmit={(event) => {
        event.preventDefault();
        onSave({ ...form, year: Number(form.year), cc: Number(form.cc) });
      }}>
        <label>Marca<input required value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} /></label>
        <label>Modelo<input required value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} /></label>
        <label>Ano<input type="number" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} /></label>
        <label>Cilindrada<input type="number" value={form.cc} onChange={(event) => setForm({ ...form, cc: event.target.value })} /></label>
        <label>Color<input value={form.color || ''} onChange={(event) => setForm({ ...form, color: event.target.value })} /></label>
        <label>Tipo<input value={form.type || ''} onChange={(event) => setForm({ ...form, type: event.target.value })} /></label>
        <label>Velocidad<input value={form.speed || ''} onChange={(event) => setForm({ ...form, speed: event.target.value })} /></label>
        <label>Consumo<input value={form.consumption || ''} onChange={(event) => setForm({ ...form, consumption: event.target.value })} /></label>
        <label className="wide-field">Modificaciones<input value={form.mods || ''} onChange={(event) => setForm({ ...form, mods: event.target.value })} /></label>
        <label className="wide-field">Descripcion<textarea value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <label className="wide-field">Foto<input type="file" accept="image/*" onChange={pickFile} /></label>
        {form.image && <img className="upload-preview wide-field" src={form.image} alt={form.model || 'Moto'} />}
        {error && <p className="form-error wide-field">{error}</p>}
        <button className="primary-button wide-field" type="submit"><Bike size={17} /> Guardar moto</button>
      </form>
    </Modal>
  );
}

function EventModal({ event, onClose, onSave }) {
  const [form, setForm] = useState({
    ...event,
    recommendationsText: (event.recommendations || []).join(', ')
  });

  return (
    <Modal title={event.id ? 'Editar evento' : 'Crear evento'} onClose={onClose}>
      <form className="modal-form two-columns" onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        onSave({
          ...form,
          recommendations: form.recommendationsText.split(',').map((item) => item.trim()).filter(Boolean),
          attendees: form.attendees || []
        });
      }}>
        <label>Nombre<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
        <label>Fecha y hora<input required type="datetime-local" value={String(form.date).slice(0, 16)} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
        <label className="wide-field">Punto de encuentro<input required value={form.meetingPoint || ''} onChange={(event) => setForm({ ...form, meetingPoint: event.target.value })} /></label>
        <label>Clima<input value={form.weather || ''} onChange={(event) => setForm({ ...form, weather: event.target.value })} /></label>
        <label>Checklist<input value={form.recommendationsText} onChange={(event) => setForm({ ...form, recommendationsText: event.target.value })} /></label>
        <button className="primary-button wide-field" type="submit"><CalendarDays size={17} /> Guardar evento</button>
      </form>
    </Modal>
  );
}

function PostModal({ post, onClose, onSave }) {
  const [form, setForm] = useState(post);
  const [error, setError] = useState('');

  async function pickFile(event) {
    try {
      const image = await readImageFile(event.target.files?.[0]);
      if (image) setForm((current) => ({ ...current, image }));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal title={post.id ? 'Editar experiencia' : 'Nueva experiencia'} onClose={onClose}>
      <form className="modal-form" onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}>
        <label>Titulo<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
        <label>Categoria<input value={form.category || ''} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
        <label>Historia<textarea required value={form.excerpt || ''} onChange={(event) => setForm({ ...form, excerpt: event.target.value })} /></label>
        <label>Tiempo de lectura<input value={form.readTime || form.read_time || ''} onChange={(event) => setForm({ ...form, readTime: event.target.value })} /></label>
        <label>Portada<input type="file" accept="image/*" onChange={pickFile} /></label>
        {form.image && <img className="upload-preview" src={form.image} alt={form.title || 'Portada'} />}
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" type="submit"><Edit3 size={17} /> Guardar publicacion</button>
      </form>
    </Modal>
  );
}

function ProfileModal({ member, isAdmin, onClose, onSave }) {
  const [form, setForm] = useState(member);
  const [error, setError] = useState('');

  async function pickFile(event) {
    try {
      const avatar = await readImageFile(event.target.files?.[0]);
      if (avatar) setForm((current) => ({ ...current, avatar }));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal title="Editar perfil biker" onClose={onClose}>
      <form className="modal-form two-columns" onSubmit={(event) => {
        event.preventDefault();
        onSave({ ...form, routes: Number(form.routes || 0), km: Number(form.km || 0) });
      }}>
        <label>Nombre<input required value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Nickname<input required value={form.nickname || ''} onChange={(event) => setForm({ ...form, nickname: event.target.value })} /></label>
        <label>Redes<input value={form.socials || ''} onChange={(event) => setForm({ ...form, socials: event.target.value })} /></label>
        <label>Moto actual<input value={form.bike || ''} onChange={(event) => setForm({ ...form, bike: event.target.value })} /></label>
        <label>Rutas<input type="number" value={form.routes || 0} onChange={(event) => setForm({ ...form, routes: event.target.value })} /></label>
        <label>Kilometros<input type="number" value={form.km || 0} onChange={(event) => setForm({ ...form, km: event.target.value })} /></label>
        {isAdmin && <label>Rol<input value={form.role || 'integrante'} onChange={(event) => setForm({ ...form, role: event.target.value })} /></label>}
        <label className="wide-field">Descripcion<textarea value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <label className="wide-field">Foto de perfil<input type="file" accept="image/*" onChange={pickFile} /></label>
        {form.avatar && <img className="upload-preview wide-field" src={form.avatar} alt={form.nickname || 'Perfil'} />}
        {error && <p className="form-error wide-field">{error}</p>}
        <button className="primary-button wide-field" type="submit"><User size={17} /> Guardar perfil</button>
      </form>
    </Modal>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <Sparkles size={18} />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function PhotoLightbox({ photo, auth, onClose, onEdit, onDelete, onComment }) {
  const [comment, setComment] = useState('');
  return (
    <div className="lightbox" role="dialog" aria-modal="true">
      <div className="lightbox-toolbar">
        <div>
          <strong>{photo.title}</strong>
          <span>{photo.location}</span>
        </div>
        <div className="lightbox-actions">
          {auth && <button className="ghost-button small" onClick={onEdit}><Edit3 size={16} /> Editar</button>}
          {auth && <button className="danger-button small" onClick={onDelete}><Trash2 size={16} /> Eliminar</button>}
          <button className="icon-button" onClick={onClose} aria-label="Cerrar"><X /></button>
        </div>
      </div>
      <div className="lightbox-body">
        <img src={photo.image} alt={photo.title} />
        <aside className="comments-panel">
          <h3>Comentarios</h3>
          {(photo.comments || []).map((item, index) => (
            <p key={item.id || index}><strong>{item.author || 'Club'}:</strong> {item.text || item}</p>
          ))}
          {auth ? (
            <form onSubmit={(event) => {
              event.preventDefault();
              onComment(comment);
              setComment('');
            }}>
              <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Escribe un comentario" />
              <button className="primary-button small" type="submit">Comentar</button>
            </form>
          ) : <small>Inicia sesion para comentar.</small>}
        </aside>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-panel">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar"><X /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Blog({ posts, auth, isAdmin, onCreate, onEdit, onDelete }) {
  return (
    <section id="blog" className="section">
      <SectionTitle
        eyebrow="Revista biker"
        title="Experiencias, consejos y cronicas de ruta"
        text="Publicaciones premium para historias de viaje, mantenimiento, modificaciones y cultura del club."
      />
      <div className="filter-row compact">
        {auth && <button className="primary-button small" onClick={onCreate}><Plus size={16} /> Nueva experiencia</button>}
      </div>
      <div className="post-grid">
        {posts.length === 0 && <EmptyState title="Sin publicaciones" text="Comparte la primera historia de ruta." />}
        {posts.map((post) => (
          <article className="post-card" key={post.id}>
            <img src={post.image} alt={post.title} loading="lazy" />
            <div>
              <span className="tag">{post.category}</span>
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
              <small>{post.author} | {post.readTime}</small>
              <div className="card-actions">
                {auth && <button className="ghost-button small" onClick={() => onEdit(post)}><Edit3 size={16} /> Editar</button>}
                {isAdmin && <button className="danger-button small" onClick={() => onDelete(post)}><Trash2 size={16} /> Eliminar</button>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Achievements({ members, stats, bikes }) {
  const topBike = bikes[0];
  return (
    <section className="section achievements">
      <SectionTitle
        eyebrow="Sistema de logros"
        title="Ranking, insignias y energia de comunidad"
        text="Ideas listas para evolucionar: moto mas votada, ranking de kilometros, modo nocturno avanzado y clima en tiempo real."
      />
      <div className="achievement-grid">
        <FeatureCard icon={<Trophy />} title="Ranking de integrantes" text={`${members[0]?.nickname || 'Redline'} lidera con ${members[0]?.km?.toLocaleString('es-PE') || '...'} km.`} />
        <FeatureCard icon={<Medal />} title="Insignias biker" text="Capitan de ruta, explorador nocturno, fotografo elite y guardian de grupo." />
        <FeatureCard icon={<Bike />} title="Moto mas votada" text={`${topBike?.brand || ''} ${topBike?.model || ''} domina el catalogo del mes.`} />
        <FeatureCard icon={<Moon />} title="Modo nocturno avanzado" text={`${stats?.kilometers?.toLocaleString('es-PE') || '...'} km registrados con interfaz dark premium.`} />
      </div>
    </section>
  );
}

function AdminPanel({ stats, members, gallery, routes, events, isAdmin }) {
  const chartData = [
    { name: 'Ene', miembros: 38, rutas: 9 },
    { name: 'Feb', miembros: 42, rutas: 11 },
    { name: 'Mar', miembros: 49, rutas: 15 },
    { name: 'Abr', miembros: 54, rutas: 18 },
    { name: 'May', miembros: 58, rutas: 21 }
  ];

  return (
    <section id="admin" className="section admin-section">
      <SectionTitle
        eyebrow="Panel administrador"
        title="Moderacion, metricas y control operativo"
        text="Dashboard moderno para gestionar usuarios, aprobar contenido, moderar comentarios, revisar eventos y monitorear rutas."
      />
      {!isAdmin && <EmptyState title="Panel protegido" text="Inicia sesion con rol fundador, administrador o moderador para gestionar la comunidad." />}
      <div className="admin-grid">
        <div className="admin-chart">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="redGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff243d" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ff243d" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#262b33" />
              <XAxis dataKey="name" stroke="#8d95a3" />
              <YAxis stroke="#8d95a3" />
              <Tooltip contentStyle={{ background: '#11151c', border: '1px solid #2c3340', color: '#fff' }} />
              <Area type="monotone" dataKey="miembros" stroke="#ff243d" fill="url(#redGlow)" />
              <Area type="monotone" dataKey="rutas" stroke="#ffffff" fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="admin-widgets">
          <FeatureCard icon={<Shield />} title="Aprobacion de contenido" text={`${gallery.length} fotos visibles y listas para moderar.`} />
          <FeatureCard icon={<Route />} title="Gestion de rutas" text={`${routes.length} rutas registradas en el mapa del club.`} />
          <FeatureCard icon={<CalendarDays />} title="Eventos activos" text={`${events.length} rodadas y reuniones cargadas.`} />
          <FeatureCard icon={<Users />} title="Usuarios" text={`${members.length || stats?.members || 0} perfiles en la comunidad.`} />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, text }) {
  return (
    <article className="feature-card">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function SectionTitle({ eyebrow, title, text }) {
  return (
    <div className="section-title">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <strong>Rapidos y Precoces</strong>
      <span>Plataforma full stack biker preparada para escalar a PostgreSQL, storage cloud y mapas con API key.</span>
    </footer>
  );
}

createRoot(document.getElementById('root')).render(<App />);
