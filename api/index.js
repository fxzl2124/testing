// Main API handler for Vercel serverless deployment
// This file acts as a single entry point that routes to all endpoints
// NOTE: dotenv not needed in Vercel - environment variables are injected automatically
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const midtransClient = require('midtrans-client');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');

// Initialize Express app
const app = express();

// --- 🔐 JWT SECRETS FROM ENV ---
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Validasi JWT_SECRET (log only, don't exit in serverless)
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('❌ ERROR: JWT_SECRET tidak ditemukan atau terlalu pendek');
  console.error('⚠️  Set JWT_SECRET di Vercel Environment Variables');
}

// --- MIDTRANS CONFIG ---
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// --- SECURITY MIDDLEWARE ---
app.use(helmet());

// CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5174',
  'http://localhost:5173',
  'http://localhost:5175',
  /\.vercel\.app$/ // Allow all Vercel preview URLs
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    });
    
    if (isAllowed) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy: Origin tidak diizinkan'), false);
  },
  credentials: true
}));

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Terlalu banyak request dari IP ini, coba lagi nanti',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 5,
  message: 'Terlalu banyak percobaan login, coba lagi dalam 15 menit',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);
app.use(express.json({ limit: '10mb' }));

// --- DATABASE CONNECTION (Optimized for Serverless) ---
let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      // Serverless-friendly connection settings
      max: 1, // Minimize connections for serverless
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

// --- AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Akses ditolak: Token tidak ada' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.log(`[SECURITY] Token verification failed from IP: ${req.ip}`);
        
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ message: 'Token expired', expired: true });
        }
        return res.status(403).json({ message: 'Akses ditolak: Token tidak valid' });
      }
      
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('[SECURITY] Authentication error:', error.message);
    return res.status(500).json({ message: 'Terjadi kesalahan autentikasi' });
  }
};

// --- ROLE MIDDLEWARE ---
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: 'Akses ditolak: Role tidak terdeteksi' });
    }
    
    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      console.log(`[SECURITY] Unauthorized role access attempt: ${userRole} tried to access ${allowedRoles.join(',')}`);
      return res.status(403).json({ message: 'Akses ditolak: Anda tidak memiliki izin' });
    }
    
    next();
  };
};

// --- HELPER FUNCTIONS ---
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>\"']/g, '');
};

const VALID_ROLES = ['PESERTA', 'ORGANISASI'];
const isValidRole = (role) => {
  return VALID_ROLES.includes(role);
};

// ======================
// AUTH ROUTES
// ======================

app.post('/api/auth/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Email tidak valid'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password minimal 8 karakter')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password harus mengandung huruf besar, huruf kecil, dan angka'),
    body('nama_lengkap')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Nama lengkap harus 3-100 karakter'),
    body('role')
      .optional()
      .isIn(VALID_ROLES)
      .withMessage('Role tidak valid')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validasi gagal', 
          errors: errors.array().map(e => e.msg) 
        });
      }

      let { email, password, nama_lengkap, role } = req.body;
      
      email = sanitizeInput(email.toLowerCase());
      nama_lengkap = sanitizeInput(nama_lengkap);
      
      const userRole = role && isValidRole(role) ? role : 'PESERTA';
      
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      const queryText = `
        INSERT INTO "User" (email, password, nama_lengkap, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, nama_lengkap, role;
      `;
      const queryValues = [email, hashedPassword, nama_lengkap, userRole];
      
      const { rows } = await getPool().query(queryText, queryValues);
      const userBaru = rows[0];
      
      console.log(`[AUDIT] New user registered: ${userBaru.email} as ${userRole} from IP: ${req.ip}`);
      
      res.status(201).json({
        message: 'Registrasi berhasil!',
        user: {
          id: userBaru.id,
          email: userBaru.email,
          nama_lengkap: userBaru.nama_lengkap,
          role: userBaru.role
        }
      });
    } catch (error) {
      if (error.code === '23505') { 
        return res.status(400).json({ message: 'Email ini sudah terdaftar.' });
      }
      console.error('[ERROR] Registration failed:', error.message);
      res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
  }
);

app.post('/api/auth/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Email tidak valid'),
    body('password').notEmpty().withMessage('Password wajib diisi')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validasi gagal', 
          errors: errors.array().map(e => e.msg) 
        });
      }

      let { email, password } = req.body;
      email = sanitizeInput(email.toLowerCase());
      
      const queryText = `SELECT * FROM "User" WHERE email = $1`;
      const { rows } = await getPool().query(queryText, [email]);
      
      if (rows.length === 0) {
        console.log(`[SECURITY] Failed login attempt for: ${email} from IP: ${req.ip}`);
        return res.status(401).json({ message: 'Email atau password salah' });
      }
      
      const user = rows[0];
      const isPasswordMatch = await bcrypt.compare(password, user.password);
      
      if (!isPasswordMatch) {
        console.log(`[SECURITY] Failed password for: ${email} from IP: ${req.ip}`);
        return res.status(401).json({ message: 'Email atau password salah' });
      }
      
      const accessToken = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        { 
          userId: user.id,
          type: 'refresh'
        },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );
      
      console.log(`[AUDIT] Successful login: ${user.email} as ${user.role} from IP: ${req.ip}`);
      
      res.status(200).json({
        message: 'Login berhasil!',
        token: accessToken,
        refreshToken: refreshToken,
        user: {
          id: user.id,
          email: user.email,
          nama_lengkap: user.nama_lengkap,
          role: user.role
        }
      });
    } catch (error) {
      console.error('[ERROR] Login failed:', error.message);
      res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
  }
);

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token tidak ada' });
    }
    
    jwt.verify(refreshToken, JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) {
        console.log(`[SECURITY] Invalid refresh token from IP: ${req.ip}`);
        return res.status(403).json({ message: 'Refresh token tidak valid' });
      }
      
      const { rows } = await getPool().query(`SELECT * FROM "User" WHERE id = $1`, [decoded.userId]);
      
      if (rows.length === 0) {
        return res.status(404).json({ message: 'User tidak ditemukan' });
      }
      
      const user = rows[0];
      
      const newAccessToken = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      res.status(200).json({
        token: newAccessToken,
        user: {
          id: user.id,
          email: user.email,
          nama_lengkap: user.nama_lengkap,
          role: user.role
        }
      });
    });
  } catch (error) {
    console.error('[ERROR] Token refresh failed:', error.message);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

// ======================
// EVENT ROUTES
// ======================

app.get('/api/events', async (req, res) => {
  console.log('[DEBUG] Menerima request ke GET /api/events');
  try {
    const queryText = `
      SELECT 
        e.id, e.nama_event, e.deskripsi, e.poster_url, e.tanggal_mulai, e.lokasi,
        u.nama_lengkap as nama_organisasi
      FROM "Event" e
      JOIN "User" u ON e.created_by_user_id = u.id
      ORDER BY e.tanggal_mulai ASC;
    `;
    const { rows } = await getPool().query(queryText);
    res.status(200).json(rows);
  } catch (error) {
    console.error('--- ERROR SAAT GET EVENTS (FULL) ---:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

app.post('/api/events', 
  authenticateToken, 
  requireRole(['ORGANISASI']),
  [
    body('nama_event').trim().isLength({ min: 3, max: 200 }).withMessage('Nama event 3-200 karakter'),
    body('deskripsi').trim().isLength({ min: 10 }).withMessage('Deskripsi minimal 10 karakter'),
    body('tanggal_mulai').isISO8601().withMessage('Format tanggal tidak valid'),
    body('lokasi').trim().notEmpty().withMessage('Lokasi wajib diisi')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validasi gagal', 
          errors: errors.array().map(e => e.msg) 
        });
      }

      let { nama_event, deskripsi, poster_url, tanggal_mulai, tanggal_selesai, lokasi } = req.body;
      
      nama_event = sanitizeInput(nama_event);
      deskripsi = sanitizeInput(deskripsi);
      lokasi = sanitizeInput(lokasi);
      
      const created_by_user_id = req.user.userId;
      
      const queryText = `
        INSERT INTO "Event" (nama_event, deskripsi, poster_url, tanggal_mulai, tanggal_selesai, lokasi, created_by_user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;
      const queryValues = [nama_event, deskripsi, poster_url, tanggal_mulai, tanggal_selesai, lokasi, created_by_user_id];
      const { rows } = await getPool().query(queryText, queryValues);
      const eventBaru = rows[0];
      
      console.log(`[AUDIT] Event created: ${eventBaru.nama_event} by user ${req.user.email}`);
      res.status(201).json(eventBaru);
    } catch (error) {
      console.error('[ERROR] Create event failed:', error.message);
      res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
  }
);

app.get('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[DEBUG] Menerima request ke GET /api/events/${id}`);
  
  try {
    const eventQueryText = `
      SELECT 
        e.id, e.nama_event, e.deskripsi, e.poster_url, e.tanggal_mulai, e.tanggal_selesai, e.lokasi,
        u.nama_lengkap as nama_organisasi
      FROM "Event" e
      JOIN "User" u ON e.created_by_user_id = u.id
      WHERE e.id = $1;
    `;
    const eventResult = await getPool().query(eventQueryText, [id]);

    if (eventResult.rows.length === 0) {
      console.log(`[DEBUG] Event dengan ID ${id} tidak ditemukan`);
      return res.status(404).json({ message: 'Event tidak ditemukan' });
    }
    
    const eventData = eventResult.rows[0];

    const ticketsQueryText = `
      SELECT * FROM "TiketTipe"
      WHERE event_id = $1
      ORDER BY harga ASC;
    `;
    const ticketsResult = await getPool().query(ticketsQueryText, [id]);
    const ticketsData = ticketsResult.rows;

    res.status(200).json({
      event: eventData,
      tickets: ticketsData
    });

  } catch (error) {
    console.error(`--- ERROR SAAT GET /api/events/${id} (FULL) ---:`, error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

app.post('/api/events/:eventId/tickets', 
  authenticateToken, 
  requireRole(['ORGANISASI']),
  [
    body('nama_tiket').trim().isLength({ min: 3, max: 100 }).withMessage('Nama tiket 3-100 karakter'),
    body('harga').isInt({ min: 0 }).withMessage('Harga harus angka >= 0'),
    body('kuota').isInt({ min: 1 }).withMessage('Kuota minimal 1')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validasi gagal', 
          errors: errors.array().map(e => e.msg) 
        });
      }

      const { eventId } = req.params;
      let { nama_tiket, harga, kuota } = req.body;
      const organizationUserId = req.user.userId;

      nama_tiket = sanitizeInput(nama_tiket);

      const eventCheckQuery = `SELECT created_by_user_id FROM "Event" WHERE id = $1`;
      const eventResult = await getPool().query(eventCheckQuery, [eventId]);

      if (eventResult.rows.length === 0) {
        return res.status(404).json({ message: 'Event tidak ditemukan' });
      }
      
      const eventOwnerId = eventResult.rows[0].created_by_user_id;
      if (eventOwnerId !== organizationUserId) {
        console.log(`[SECURITY] Unauthorized ticket creation attempt by user ${organizationUserId} for event ${eventId}`);
        return res.status(403).json({ message: 'Akses ditolak: Anda bukan pemilik event ini' });
      }

      const insertTicketQuery = `
        INSERT INTO "TiketTipe" (event_id, nama_tiket, harga, kuota)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const insertResult = await getPool().query(insertTicketQuery, [eventId, nama_tiket, harga, kuota]);
      const tiketBaru = insertResult.rows[0];
      
      console.log(`[AUDIT] Ticket created: "${nama_tiket}" for event ${eventId} by user ${req.user.email}`);
      res.status(201).json(tiketBaru);

    } catch (error) {
      console.error('[ERROR] Create ticket failed:', error.message);
      res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
  }
);

app.post('/api/events/:eventId/register', authenticateToken, async (req, res) => {
  const { eventId } = req.params;
  const { tiket_tipe_id } = req.body;
  const userId = req.user.userId;

  console.log(`[DEBUG] User ${userId} mendaftar ke event ${eventId} dengan tiket ${tiket_tipe_id}`);

  try {
    const tiketQuery = `
      SELECT tt.*, e.nama_event 
      FROM "TiketTipe" tt
      JOIN "Event" e ON tt.event_id = e.id
      WHERE tt.id = $1 AND e.id = $2
    `;
    const tiketResult = await getPool().query(tiketQuery, [tiket_tipe_id, eventId]);

    if (tiketResult.rows.length === 0) {
      return res.status(404).json({ message: 'Tipe tiket tidak valid untuk event ini' });
    }
    
    const tiketData = tiketResult.rows[0];

    const registrasiCheckQuery = `SELECT id FROM "Registrasi" WHERE user_id = $1 AND event_id = $2`;
    const registrasiCheckResult = await getPool().query(registrasiCheckQuery, [userId, eventId]);
    if (registrasiCheckResult.rows.length > 0) {
      return res.status(400).json({ message: 'Anda sudah terdaftar di event ini' });
    }

    const countQuery = `SELECT COUNT(*) FROM "Registrasi" WHERE tiket_tipe_id = $1`;
    const countResult = await getPool().query(countQuery, [tiket_tipe_id]);
    const jumlahTerdaftar = parseInt(countResult.rows[0].count, 10);

    if (jumlahTerdaftar >= tiketData.kuota) {
      return res.status(400).json({ message: 'Maaf, tiket untuk tipe ini sudah habis' });
    }

    const qrCodeUnik = `EVT-${eventId}-USR-${userId}-${Date.now()}`;

    const insertRegistrasiQuery = `
      INSERT INTO "Registrasi" (event_id, user_id, tiket_tipe_id, status_pembayaran, qr_code_unik)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, status_pembayaran, qr_code_unik;
    `;
    const insertResult = await getPool().query(insertRegistrasiQuery, [eventId, userId, tiket_tipe_id, 'PENDING', qrCodeUnik]);
    const pendaftaranBaru = insertResult.rows[0];

    let paymentToken = null;
    if (tiketData.harga > 0) {
      const userQuery = `SELECT email, nama_lengkap FROM "User" WHERE id = $1`;
      const userResult = await getPool().query(userQuery, [userId]);
      const userData = userResult.rows[0];

      const parameter = {
        transaction_details: {
          order_id: `ORDER-${pendaftaranBaru.id}-${Date.now()}`,
          gross_amount: tiketData.harga
        },
        credit_card: {
          secure: true
        },
        customer_details: {
          email: userData.email,
          first_name: userData.nama_lengkap
        },
        item_details: [{
          id: tiket_tipe_id,
          price: tiketData.harga,
          quantity: 1,
          name: `${tiketData.nama_event} - ${tiketData.nama_tiket}`
        }]
      };

      const transaction = await snap.createTransaction(parameter);
      paymentToken = transaction.token;
    }

    console.log(`[SUCCESS] User ${userId} berhasil mendaftar ke event ${eventId}`);
    res.status(201).json({
      message: tiketData.harga > 0 ? 'Pendaftaran berhasil! Silakan selesaikan pembayaran.' : 'Pendaftaran berhasil!',
      pendaftaran: pendaftaranBaru,
      paymentToken: paymentToken,
      paymentUrl: paymentToken ? `https://app.sandbox.midtrans.com/snap/v2/vtweb/${paymentToken}` : null,
      isFree: tiketData.harga === 0
    });

  } catch (error) {
    console.error(`--- ERROR SAAT POST /api/events/${eventId}/register (FULL) ---:`, error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

// ======================
// ORGANISASI ROUTES
// ======================

app.get('/api/organisasi/my-events', 
  authenticateToken, 
  requireRole(['ORGANISASI']),
  async (req, res) => {
    try {
      const organizationUserId = req.user.userId;

      const queryText = `SELECT * FROM "Event" WHERE created_by_user_id = $1 ORDER BY tanggal_mulai DESC`;
      const { rows } = await getPool().query(queryText, [organizationUserId]);
      
      res.status(200).json(rows);

    } catch (error) {
      console.error('[ERROR] Get my events failed:', error.message);
      res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
  }
);

app.get('/api/organisasi/my-events/:eventId/attendees', 
  authenticateToken, 
  requireRole(['ORGANISASI']),
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const organizationUserId = req.user.userId;

      const eventCheckQuery = `SELECT created_by_user_id FROM "Event" WHERE id = $1`;
      const eventResult = await getPool().query(eventCheckQuery, [eventId]);
      
      if (eventResult.rows.length === 0) {
        return res.status(404).json({ message: 'Event tidak ditemukan' });
      }
      
      if (eventResult.rows[0].created_by_user_id !== organizationUserId) {
        console.log(`[SECURITY] Unauthorized attendees access attempt by user ${organizationUserId} for event ${eventId}`);
        return res.status(403).json({ message: 'Akses ditolak: Anda bukan pemilik event ini' });
      }

      const attendeesQuery = `
        SELECT 
          r.id as registrasi_id, 
          r.status_pembayaran,
          u.nama_lengkap,
          u.email,
          tt.nama_tiket,
          tt.harga
        FROM "Registrasi" r
        JOIN "User" u ON r.user_id = u.id
        JOIN "TiketTipe" tt ON r.tiket_tipe_id = tt.id
        WHERE r.event_id = $1;
      `;
      const { rows } = await getPool().query(attendeesQuery, [eventId]);

      res.status(200).json(rows);

    } catch (error) {
      console.error('[ERROR] Get attendees failed:', error.message);
      res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
  }
);

app.patch('/api/organisasi/confirm-payment/:registrasiId', 
  authenticateToken, 
  requireRole(['ORGANISASI']),
  async (req, res) => {
    try {
      const { registrasiId } = req.params;
      const organizationUserId = req.user.userId;

      const verificationQuery = `
        SELECT e.created_by_user_id, r.status_pembayaran
        FROM "Registrasi" r
        JOIN "Event" e ON r.event_id = e.id
        WHERE r.id = $1;
      `;
      const verificationResult = await getPool().query(verificationQuery, [registrasiId]);

      if (verificationResult.rows.length === 0) {
        return res.status(404).json({ message: 'Data pendaftaran tidak ditemukan' });
      }
      
      if (verificationResult.rows[0].created_by_user_id !== organizationUserId) {
        console.log(`[SECURITY] Unauthorized payment confirmation attempt by user ${organizationUserId} for registration ${registrasiId}`);
        return res.status(403).json({ message: 'Akses ditolak: Anda tidak berhak mengkonfirmasi pendaftaran ini' });
      }

      const updateQuery = `
        UPDATE "Registrasi"
        SET status_pembayaran = 'LUNAS'
        WHERE id = $1
        RETURNING id, status_pembayaran;
      `;
      const { rows } = await getPool().query(updateQuery, [registrasiId]);

      console.log(`[AUDIT] Payment confirmed for registration ${registrasiId} by user ${req.user.email}`);
      res.status(200).json(rows[0]);

    } catch (error) {
      console.error('[ERROR] Payment confirmation failed:', error.message);
      res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
  }
);

// ======================
// PESERTA ROUTES
// ======================

app.get('/api/peserta/my-registrations', 
  authenticateToken, 
  requireRole(['PESERTA']),
  async (req, res) => {
    try {
      const userId = req.user.userId;
      
      const queryText = `
        SELECT 
          r.id as registrasi_id,
          e.nama_event,
          e.tanggal_mulai,
          e.lokasi,
          r.status_pembayaran,
          r.qr_code_unik,
          tt.nama_tiket,
          tt.harga
        FROM "Registrasi" r
        JOIN "Event" e ON r.event_id = e.id
        JOIN "TiketTipe" tt ON r.tiket_tipe_id = tt.id
        WHERE r.user_id = $1
        ORDER BY e.tanggal_mulai DESC;
      `;
      const { rows } = await getPool().query(queryText, [userId]);
      
      res.status(200).json(rows);

    } catch (error) {
      console.error('[ERROR] Get my registrations failed:', error.message);
      res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
  }
);

// ======================
// PAYMENT ROUTES
// ======================

app.post('/api/payment/notification', async (req, res) => {
  console.log('[MIDTRANS] Menerima notifikasi:', req.body);
  
  try {
    const notification = req.body;
    
    const statusResponse = await snap.transaction.notification(notification);
    
    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    console.log(`[MIDTRANS] Order ${orderId} - Status: ${transactionStatus}, Fraud: ${fraudStatus}`);

    const registrasiId = orderId.split('-')[1];

    let newStatus = 'PENDING';
    
    if (transactionStatus == 'capture') {
      if (fraudStatus == 'accept') {
        newStatus = 'LUNAS';
      }
    } else if (transactionStatus == 'settlement') {
      newStatus = 'LUNAS';
    } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') {
      newStatus = 'BATAL';
    } else if (transactionStatus == 'pending') {
      newStatus = 'PENDING';
    }

    const updateQuery = `
      UPDATE "Registrasi" 
      SET status_pembayaran = $1 
      WHERE id = $2
      RETURNING *;
    `;
    const result = await getPool().query(updateQuery, [newStatus, registrasiId]);

    console.log(`[MIDTRANS] Registrasi ${registrasiId} diupdate ke status: ${newStatus}`);

    res.status(200).json({ message: 'Notification received' });

  } catch (error) {
    console.error('[MIDTRANS ERROR]:', error);
    res.status(500).json({ message: 'Error processing notification' });
  }
});

app.get('/api/payment/status/:orderId', authenticateToken, async (req, res) => {
  const { orderId } = req.params;
  
  try {
    const statusResponse = await snap.transaction.status(orderId);
    res.status(200).json(statusResponse);
  } catch (error) {
    console.error('[MIDTRANS] Error checking status:', error);
    res.status(500).json({ message: 'Error checking payment status' });
  }
});

// Export handler for Vercel serverless
module.exports = app;
module.exports.default = app;
