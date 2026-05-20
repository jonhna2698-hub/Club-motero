const passwordHash = 'admin123';

export const seed = {
  stats: { kilometers: 48270, routes: 126, members: 58, bikes: 43 },
  users: [
    {
      id: 'u-1',
      name: 'Mateo Salas',
      nickname: 'Redline',
      email: 'admin@rapidos.test',
      passwordHash,
      role: 'fundador',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
      joinedAt: '2021-04-17',
      socials: '@redline.ryp',
      bike: 'Ducati Panigale V4',
      routes: 88,
      km: 19400
    },
    {
      id: 'u-2',
      name: 'Lucia Vega',
      nickname: 'Apex',
      email: 'apex@rapidos.test',
      passwordHash,
      role: 'capitan de ruta',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
      joinedAt: '2022-08-03',
      socials: '@apexride',
      bike: 'Yamaha MT-09',
      routes: 61,
      km: 13750
    },
    {
      id: 'u-3',
      name: 'Diego Flores',
      nickname: 'Flashcam',
      email: 'flash@rapidos.test',
      passwordHash,
      role: 'fotografo',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80',
      joinedAt: '2023-01-11',
      socials: '@flashcam.moto',
      bike: 'Kawasaki Ninja 650',
      routes: 42,
      km: 8700
    }
  ],
  routes: [
    {
      id: 'r-1',
      name: 'Costa Roja Nocturna',
      type: 'costera',
      date: '2026-05-31',
      distance: 214,
      duration: '4h 20m',
      participants: 18,
      difficulty: 'intermedia',
      weather: 'despejado, 18 C',
      description: 'Rodada al borde del Pacifico con parada fotografica y cena de cierre.',
      start: [-12.0464, -77.0428],
      points: [[-12.0464, -77.0428], [-12.142, -77.03], [-12.371, -76.781], [-12.523, -76.738]],
      photos: ['https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80'],
      comments: ['Asfalto limpio en el segundo tramo.', 'Ideal para salida nocturna controlada.']
    },
    {
      id: 'r-2',
      name: 'Sierra Turbo',
      type: 'montana',
      date: '2026-06-14',
      distance: 326,
      duration: '7h 15m',
      participants: 12,
      difficulty: 'alta',
      weather: 'frio seco, 10 C',
      description: 'Curvas tecnicas, altura y paisajes para pilotos con experiencia.',
      start: [-11.936, -76.698],
      points: [[-12.0464, -77.0428], [-11.936, -76.698], [-11.78, -76.49], [-11.52, -76.37]],
      photos: ['https://images.unsplash.com/photo-1508357941501-0924cf312bbd?auto=format&fit=crop&w=800&q=80'],
      comments: ['Revisar frenos antes de subir.', 'Llevar guantes termicos.']
    },
    {
      id: 'r-3',
      name: 'Valle Relampago',
      type: 'valle',
      date: '2026-04-19',
      distance: 148,
      duration: '3h 05m',
      participants: 24,
      difficulty: 'facil',
      weather: 'templado, 21 C',
      description: 'Ruta social de baja dificultad para nuevos integrantes.',
      start: [-12.09, -76.88],
      points: [[-12.0464, -77.0428], [-12.09, -76.88], [-12.16, -76.75]],
      photos: ['https://images.unsplash.com/photo-1511994298241-608e28f14fde?auto=format&fit=crop&w=800&q=80'],
      comments: ['Perfecta para iniciar.', 'Buen punto de hidratacion en el km 74.']
    }
  ],
  gallery: [
    {
      id: 'g-1',
      title: 'Linea roja al amanecer',
      author: 'Flashcam',
      moto: 'Kawasaki Ninja 650',
      event: 'Costa Roja Nocturna',
      location: 'Panamericana Sur',
      image: 'https://images.unsplash.com/photo-1558981852-426c6c22a060?auto=format&fit=crop&w=900&q=80',
      reactions: 241,
      comments: ['Toma brutal', 'Ese reflejo quedo perfecto']
    },
    {
      id: 'g-2',
      title: 'Pit stop de hermandad',
      author: 'Apex',
      moto: 'Yamaha MT-09',
      event: 'Valle Relampago',
      location: 'Cieneguilla',
      image: 'https://images.unsplash.com/photo-1524591652733-73fa1ae7b5ee?auto=format&fit=crop&w=900&q=80',
      reactions: 188,
      comments: ['Gran rodada', 'La siguiente sera mas larga']
    },
    {
      id: 'g-3',
      title: 'Garage de guerra',
      author: 'Redline',
      moto: 'Ducati Panigale V4',
      event: 'Moto del mes',
      location: 'Clubhouse',
      image: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=900&q=80',
      reactions: 319,
      comments: ['La reina del mes', 'Esas mods se ven finas']
    }
  ],
  bikes: [
    {
      id: 'b-1',
      owner: 'Redline',
      brand: 'Ducati',
      model: 'Panigale V4',
      year: 2024,
      cc: 1103,
      color: 'Rojo Corse',
      type: 'super sport',
      speed: '299 km/h',
      consumption: '6.9 L/100km',
      mods: 'Escape Akrapovic, quickshifter calibrado, sliders CNC',
      description: 'La insignia roja del club, ajustada para pista y carretera.',
      image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=900&q=80',
      votes: 892,
      featured: true
    },
    {
      id: 'b-2',
      owner: 'Apex',
      brand: 'Yamaha',
      model: 'MT-09',
      year: 2023,
      cc: 890,
      color: 'Graphite Storm',
      type: 'naked',
      speed: '225 km/h',
      consumption: '5.5 L/100km',
      mods: 'Suspension regulada, defensas, luces auxiliares',
      description: 'Agil, agresiva y lista para curvas de sierra.',
      image: 'https://images.unsplash.com/photo-1558980664-10e7170b5df9?auto=format&fit=crop&w=900&q=80',
      votes: 744,
      featured: false
    },
    {
      id: 'b-3',
      owner: 'Flashcam',
      brand: 'Kawasaki',
      model: 'Ninja 650',
      year: 2022,
      cc: 649,
      color: 'Lime Black',
      type: 'sport touring',
      speed: '212 km/h',
      consumption: '4.8 L/100km',
      mods: 'Maleteras soft, soporte de camara, parabrisas touring',
      description: 'Equilibrio entre fotografia, distancia y adrenalina.',
      image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80',
      votes: 611,
      featured: false
    }
  ],
  events: [
    {
      id: 'e-1',
      title: 'Rodada Sierra Turbo',
      date: '2026-06-14T06:30:00',
      meetingPoint: 'Grifo Primax La Molina',
      weather: 'Frio seco',
      recommendations: ['Casco certificado', 'Guantes termicos', 'Frenos revisados', 'Documentos vigentes'],
      attendees: ['Redline', 'Apex', 'Flashcam', 'Torque'],
      map: [-12.082, -76.928]
    },
    {
      id: 'e-2',
      title: 'Noche de Garage',
      date: '2026-05-29T20:00:00',
      meetingPoint: 'Clubhouse R&P',
      weather: 'Templado',
      recommendations: ['Traer herramienta personal', 'Fotos para catalogo', 'Votacion moto del mes'],
      attendees: ['Apex', 'Flashcam'],
      map: [-12.067, -77.036]
    }
  ],
  posts: [
    {
      id: 'p-1',
      title: 'Como preparar la moto para una ruta de altura',
      author: 'Apex',
      category: 'Consejos',
      excerpt: 'Presion, frenos, capas termicas y ritmo de grupo para no sufrir la sierra.',
      image: 'https://images.unsplash.com/photo-1508357941501-0924cf312bbd?auto=format&fit=crop&w=900&q=80',
      readTime: '6 min'
    },
    {
      id: 'p-2',
      title: 'La noche que el club conquisto la Costa Roja',
      author: 'Redline',
      category: 'Experiencias',
      excerpt: 'Cronica de una rodada limpia, luces rojas y hermandad sobre la Panamericana.',
      image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80',
      readTime: '8 min'
    }
  ],
  admin: {
    pendingContent: 7,
    reportedComments: 2,
    routeApprovals: 3,
    monthlyGrowth: [
      { name: 'Ene', miembros: 38, rutas: 9 },
      { name: 'Feb', miembros: 42, rutas: 11 },
      { name: 'Mar', miembros: 49, rutas: 15 },
      { name: 'Abr', miembros: 54, rutas: 18 },
      { name: 'May', miembros: 58, rutas: 21 }
    ]
  }
};
