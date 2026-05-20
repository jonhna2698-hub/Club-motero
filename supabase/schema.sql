create table if not exists members (
  id text primary key,
  name text not null,
  nickname text not null,
  email text unique not null,
  password_hash text not null,
  role text not null default 'integrante',
  avatar text,
  joined_at date not null default current_date,
  socials text default '',
  bike text default 'Por registrar',
  routes integer default 0,
  km integer default 0,
  description text default '',
  created_at timestamptz not null default now()
);

create table if not exists routes (
  id text primary key,
  name text not null,
  type text not null,
  date date not null,
  distance integer not null default 0,
  duration text not null default '',
  participants integer not null default 0,
  difficulty text not null default 'facil',
  weather text not null default '',
  description text not null default '',
  start jsonb not null default '[]'::jsonb,
  points jsonb not null default '[]'::jsonb,
  photos jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists gallery_photos (
  id text primary key,
  title text not null,
  author text not null,
  moto text default '',
  event text default '',
  location text default '',
  image text not null,
  reactions integer not null default 0,
  liked_by jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists bikes (
  id text primary key,
  owner_id text,
  owner text,
  brand text not null,
  model text not null,
  year integer,
  cc integer,
  color text,
  type text,
  speed text,
  consumption text,
  mods text,
  description text,
  image text,
  votes integer not null default 0,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id text primary key,
  title text not null,
  date timestamptz not null,
  meeting_point text not null,
  weather text,
  recommendations jsonb not null default '[]'::jsonb,
  attendees jsonb not null default '[]'::jsonb,
  map jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id text primary key,
  title text not null,
  author text not null,
  category text not null,
  excerpt text not null,
  image text,
  read_time text,
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

alter table members add column if not exists description text default '';
alter table gallery_photos add column if not exists approved boolean not null default true;
alter table gallery_photos add column if not exists liked_by jsonb not null default '[]'::jsonb;
alter table posts add column if not exists approved boolean not null default true;

insert into members (id, name, nickname, email, password_hash, role, avatar, joined_at, socials, bike, routes, km)
values
  ('u-1', 'Mateo Salas', 'Redline', 'admin@rapidos.test', 'admin123', 'fundador', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80', '2021-04-17', '@redline.ryp', 'Ducati Panigale V4', 88, 19400),
  ('u-2', 'Lucia Vega', 'Apex', 'apex@rapidos.test', 'admin123', 'capitan de ruta', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80', '2022-08-03', '@apexride', 'Yamaha MT-09', 61, 13750),
  ('u-3', 'Diego Flores', 'Flashcam', 'flash@rapidos.test', 'admin123', 'fotografo', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80', '2023-01-11', '@flashcam.moto', 'Kawasaki Ninja 650', 42, 8700)
on conflict (id) do nothing;

insert into routes (id, name, type, date, distance, duration, participants, difficulty, weather, description, start, points, photos, comments)
values
  ('r-1', 'Costa Roja Nocturna', 'costera', '2026-05-31', 214, '4h 20m', 18, 'intermedia', 'despejado, 18 C', 'Rodada al borde del Pacifico con parada fotografica y cena de cierre.', '[-12.0464,-77.0428]', '[[-12.0464,-77.0428],[-12.142,-77.03],[-12.371,-76.781],[-12.523,-76.738]]', '["https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80"]', '["Asfalto limpio en el segundo tramo.","Ideal para salida nocturna controlada."]'),
  ('r-2', 'Sierra Turbo', 'montana', '2026-06-14', 326, '7h 15m', 12, 'alta', 'frio seco, 10 C', 'Curvas tecnicas, altura y paisajes para pilotos con experiencia.', '[-11.936,-76.698]', '[[-12.0464,-77.0428],[-11.936,-76.698],[-11.78,-76.49],[-11.52,-76.37]]', '["https://images.unsplash.com/photo-1508357941501-0924cf312bbd?auto=format&fit=crop&w=800&q=80"]', '["Revisar frenos antes de subir.","Llevar guantes termicos."]'),
  ('r-3', 'Valle Relampago', 'valle', '2026-04-19', 148, '3h 05m', 24, 'facil', 'templado, 21 C', 'Ruta social de baja dificultad para nuevos integrantes.', '[-12.09,-76.88]', '[[-12.0464,-77.0428],[-12.09,-76.88],[-12.16,-76.75]]', '["https://images.unsplash.com/photo-1511994298241-608e28f14fde?auto=format&fit=crop&w=800&q=80"]', '["Perfecta para iniciar.","Buen punto de hidratacion en el km 74."]')
on conflict (id) do nothing;

insert into gallery_photos (id, title, author, moto, event, location, image, reactions, comments)
values
  ('g-1', 'Linea roja al amanecer', 'Flashcam', 'Kawasaki Ninja 650', 'Costa Roja Nocturna', 'Panamericana Sur', 'https://images.unsplash.com/photo-1558981852-426c6c22a060?auto=format&fit=crop&w=900&q=80', 241, '["Toma brutal","Ese reflejo quedo perfecto"]'),
  ('g-2', 'Pit stop de hermandad', 'Apex', 'Yamaha MT-09', 'Valle Relampago', 'Cieneguilla', 'https://images.unsplash.com/photo-1524591652733-73fa1ae7b5ee?auto=format&fit=crop&w=900&q=80', 188, '["Gran rodada","La siguiente sera mas larga"]'),
  ('g-3', 'Garage de guerra', 'Redline', 'Ducati Panigale V4', 'Moto del mes', 'Clubhouse', 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=900&q=80', 319, '["La reina del mes","Esas mods se ven finas"]')
on conflict (id) do nothing;

insert into bikes (id, owner, brand, model, year, cc, color, type, speed, consumption, mods, description, image, votes, featured)
values
  ('b-1', 'Redline', 'Ducati', 'Panigale V4', 2024, 1103, 'Rojo Corse', 'super sport', '299 km/h', '6.9 L/100km', 'Escape Akrapovic, quickshifter calibrado, sliders CNC', 'La insignia roja del club, ajustada para pista y carretera.', 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=900&q=80', 892, true),
  ('b-2', 'Apex', 'Yamaha', 'MT-09', 2023, 890, 'Graphite Storm', 'naked', '225 km/h', '5.5 L/100km', 'Suspension regulada, defensas, luces auxiliares', 'Agil, agresiva y lista para curvas de sierra.', 'https://images.unsplash.com/photo-1558980664-10e7170b5df9?auto=format&fit=crop&w=900&q=80', 744, false),
  ('b-3', 'Flashcam', 'Kawasaki', 'Ninja 650', 2022, 649, 'Lime Black', 'sport touring', '212 km/h', '4.8 L/100km', 'Maleteras soft, soporte de camara, parabrisas touring', 'Equilibrio entre fotografia, distancia y adrenalina.', 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80', 611, false)
on conflict (id) do nothing;

insert into events (id, title, date, meeting_point, weather, recommendations, attendees, map)
values
  ('e-1', 'Rodada Sierra Turbo', '2026-06-14T06:30:00', 'Grifo Primax La Molina', 'Frio seco', '["Casco certificado","Guantes termicos","Frenos revisados","Documentos vigentes"]', '["Redline","Apex","Flashcam","Torque"]', '[-12.082,-76.928]'),
  ('e-2', 'Noche de Garage', '2026-05-29T20:00:00', 'Clubhouse R&P', 'Templado', '["Traer herramienta personal","Fotos para catalogo","Votacion moto del mes"]', '["Apex","Flashcam"]', '[-12.067,-77.036]')
on conflict (id) do nothing;

insert into posts (id, title, author, category, excerpt, image, read_time)
values
  ('p-1', 'Como preparar la moto para una ruta de altura', 'Apex', 'Consejos', 'Presion, frenos, capas termicas y ritmo de grupo para no sufrir la sierra.', 'https://images.unsplash.com/photo-1508357941501-0924cf312bbd?auto=format&fit=crop&w=900&q=80', '6 min'),
  ('p-2', 'La noche que el club conquisto la Costa Roja', 'Redline', 'Experiencias', 'Cronica de una rodada limpia, luces rojas y hermandad sobre la Panamericana.', 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80', '8 min')
on conflict (id) do nothing;
