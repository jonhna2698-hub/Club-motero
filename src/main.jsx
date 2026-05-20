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
  MapPin,
  Medal,
  Menu,
  MessageCircle,
  Moon,
  Route,
  Shield,
  Sparkles,
  Star,
  Trophy,
  Upload,
  Users,
  X,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
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
  const [notice, setNotice] = useState('');

  const filteredRoutes = useMemo(() => {
    return data.routes.filter((route) => {
      const routeMatch = activeRoute === 'todas' || route.type === activeRoute;
      const diffMatch = activeDifficulty === 'todas' || route.difficulty === activeDifficulty;
      return routeMatch && diffMatch;
    });
  }, [data.routes, activeRoute, activeDifficulty]);

  return (
    <div className="app-shell">
      <Header mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
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
          onEditRoute={setEditingRoute}
        />
        <Gallery
          gallery={data.gallery}
          onUpload={() => {
            if (!auth) return setAuthOpen(true);
            setUploadOpen(true);
          }}
          onReact={(id) => {
            setData((current) => ({
              ...current,
              gallery: current.gallery.map((photo) => photo.id === id ? { ...photo, reactions: photo.reactions + 1 } : photo)
            }));
          }}
          onEdit={setEditingPhoto}
          onOpen={setViewingPhoto}
        />
        <Bikes
          bikes={data.bikes}
          onVote={(id) => {
            setData((current) => ({
              ...current,
              bikes: current.bikes.map((bike) => bike.id === id ? { ...bike, votes: bike.votes + 1 } : bike)
            }));
          }}
        />
        <Members members={data.members} />
        <Events
          events={data.events}
          auth={auth}
          onAttend={(id) => {
            if (!auth) return setAuthOpen(true);
            setData((current) => ({
              ...current,
              events: current.events.map((event) => {
                if (event.id !== id || event.attendees.includes(auth.user.nickname)) return event;
                return { ...event, attendees: [...event.attendees, auth.user.nickname] };
              })
            }));
          }}
        />
        <Blog posts={data.posts} />
        <Achievements members={data.members} stats={data.stats} bikes={data.bikes} />
        <AdminPanel />
      </main>
      {notice && <div className="toast">{notice}</div>}
      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onAuth={(session) => {
            localStorage.setItem('ryp-auth', JSON.stringify(session));
            setAuth(session);
            setAuthOpen(false);
            setNotice(`Sesion iniciada como ${session.user.nickname}`);
            setTimeout(() => setNotice(''), 2600);
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
            setNotice('Foto subida a la galeria');
            setTimeout(() => setNotice(''), 2600);
          }}
        />
      )}
      {editingPhoto && (
        <EditPhotoModal
          photo={editingPhoto}
          onClose={() => setEditingPhoto(null)}
          onSave={(updatedPhoto) => {
            setData((current) => ({
              ...current,
              gallery: current.gallery.map((photo) => photo.id === updatedPhoto.id ? updatedPhoto : photo)
            }));
            setViewingPhoto((current) => current?.id === updatedPhoto.id ? updatedPhoto : current);
            setEditingPhoto(null);
            setNotice('Foto actualizada');
            setTimeout(() => setNotice(''), 2600);
          }}
        />
      )}
      {viewingPhoto && <PhotoLightbox photo={viewingPhoto} onClose={() => setViewingPhoto(null)} onEdit={() => setEditingPhoto(viewingPhoto)} />}
      {editingRoute && (
        <EditRouteModal
          route={editingRoute}
          onClose={() => setEditingRoute(null)}
          onSave={(updatedRoute) => {
            setData((current) => ({
              ...current,
              routes: current.routes.map((route) => route.id === updatedRoute.id ? updatedRoute : route)
            }));
            setEditingRoute(null);
            setNotice('Ruta actualizada');
            setTimeout(() => setNotice(''), 2600);
          }}
        />
      )}
      <Footer />
    </div>
  );
}

function Header({ mobileOpen, setMobileOpen }) {
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
      <button className="icon-button menu-button" onClick={() => setMobileOpen((value) => !value)} aria-label="Abrir menu">
        {mobileOpen ? <X /> : <Menu />}
      </button>
      {mobileOpen && (
        <nav className="mobile-nav">
          {nav.map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={() => setMobileOpen(false)}>{label}</a>
          ))}
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

function RoutesMap({ routes, activeRoute, setActiveRoute, activeDifficulty, setActiveDifficulty, onEditRoute }) {
  const center = routes[0]?.start || [-12.0464, -77.0428];

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
      </div>
      <div className="map-layout">
        <div className="map-frame">
          <MapContainer center={center} zoom={8} scrollWheelZoom className="leaflet-map">
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {routes.map((route) => (
              <React.Fragment key={route.id}>
                <Polyline positions={route.points} pathOptions={{ color: '#ff243d', weight: 5, opacity: 0.85 }} />
                <Marker position={route.start}>
                  <Popup>
                    <strong>{route.name}</strong><br />
                    {route.distance} km | {route.difficulty}<br />
                    {route.weather}
                  </Popup>
                </Marker>
              </React.Fragment>
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
              <button className="edit-button" onClick={() => onEditRoute(route)}><Edit3 size={16} /> Editar ruta</button>
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

function Gallery({ gallery, onUpload, onReact, onEdit, onOpen }) {
  const filters = ['integrante', 'moto', 'evento', 'ubicacion'];
  return (
    <section id="galeria" className="section">
      <SectionTitle
        eyebrow="Galeria social"
        title="Fotos, reacciones y albumes de ruta"
        text="Un grid visual para subir fotos, reaccionar, comentar y filtrar recuerdos por integrante, moto, evento o ubicacion."
      />
      <div className="filter-row compact">
        {filters.map((filter) => <button className="chip" key={filter}>{filter}</button>)}
        <button className="primary-button small" onClick={onUpload}><Upload size={16} /> Subir foto</button>
      </div>
      <div className="gallery-grid">
        {gallery.map((photo, index) => (
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
                <button className="inline-action" onClick={() => onEdit(photo)}><Edit3 size={16} /> Editar</button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function Bikes({ bikes, onVote }) {
  return (
    <section id="motos" className="section">
      <SectionTitle
        eyebrow="Catalogo premium"
        title="Maquinas registradas por la comunidad"
        text="Tarjetas de alto impacto con ficha tecnica, modificaciones, consumo, votos y motos destacadas."
      />
      <div className="bike-grid">
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
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Members({ members }) {
  return (
    <section id="miembros" className="section">
      <SectionTitle
        eyebrow="Perfiles biker"
        title="Integrantes, roles, kilometros y reputacion"
        text="Cada perfil muestra nickname, moto actual, kilometraje, fecha de ingreso, rol y redes sociales."
      />
      <div className="member-grid">
        {members.map((member) => (
          <article className="member-card" key={member.id}>
            <img src={member.avatar} alt={member.nickname} loading="lazy" />
            <div>
              <span className="tag">{member.role}</span>
              <h3>{member.nickname}</h3>
              <p>{member.name} | {member.bike}</p>
              <div className="member-stats">
                <span>{member.routes}<small>rutas</small></span>
                <span>{member.km?.toLocaleString('es-PE')}<small>km</small></span>
                <span>{member.joinedAt}<small>ingreso</small></span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Events({ events, auth, onAttend }) {
  return (
    <section id="eventos" className="section event-section">
      <SectionTitle
        eyebrow="Rodadas y eventos"
        title="Agenda con asistencia, clima y checklist"
        text="Organiza salidas con punto de encuentro, contador, participantes, recomendaciones y mapa del meetup."
      />
      <div className="event-grid">
        {events.map((event) => <EventCard event={event} auth={auth} onAttend={onAttend} key={event.id} />)}
      </div>
    </section>
  );
}

function EventCard({ event, auth, onAttend }) {
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
    if (!file.type.startsWith('image/')) {
      setError('Selecciona una imagen valida.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result);
      setPreview(reader.result);
      setError('');
    };
    reader.readAsDataURL(file);
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
    if (!file.type.startsWith('image/')) return setError('Selecciona una imagen valida.');
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, image: reader.result }));
      setPreview(reader.result);
      setError('');
    };
    reader.readAsDataURL(file);
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
    description: route.description
  });

  function submit(event) {
    event.preventDefault();
    onSave({
      ...route,
      ...form,
      distance: Number(form.distance),
      participants: Number(form.participants)
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
        <button className="primary-button wide-field" type="submit"><Edit3 size={17} /> Guardar ruta</button>
      </form>
    </Modal>
  );
}

function PhotoLightbox({ photo, onClose, onEdit }) {
  return (
    <div className="lightbox" role="dialog" aria-modal="true">
      <div className="lightbox-toolbar">
        <div>
          <strong>{photo.title}</strong>
          <span>{photo.location}</span>
        </div>
        <div className="lightbox-actions">
          <button className="ghost-button small" onClick={onEdit}><Edit3 size={16} /> Editar</button>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar"><X /></button>
        </div>
      </div>
      <img src={photo.image} alt={photo.title} />
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

function Blog({ posts }) {
  return (
    <section id="blog" className="section">
      <SectionTitle
        eyebrow="Revista biker"
        title="Experiencias, consejos y cronicas de ruta"
        text="Publicaciones premium para historias de viaje, mantenimiento, modificaciones y cultura del club."
      />
      <div className="post-grid">
        {posts.map((post) => (
          <article className="post-card" key={post.id}>
            <img src={post.image} alt={post.title} loading="lazy" />
            <div>
              <span className="tag">{post.category}</span>
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
              <small>{post.author} | {post.readTime}</small>
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

function AdminPanel() {
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
          <FeatureCard icon={<Shield />} title="Aprobacion de contenido" text="7 publicaciones esperando revision." />
          <FeatureCard icon={<MessageCircle />} title="Moderacion" text="2 comentarios reportados por la comunidad." />
          <FeatureCard icon={<Lock />} title="Control de roles" text="Fundador, administrador, capitan, fotografo, moderador e integrante." />
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
