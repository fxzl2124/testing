# 🚀 Panduan Deploy ke Vercel

## 📋 Prasyarat
- Akun Vercel (https://vercel.com)
- Repository GitHub (opsional tapi disarankan)

## 🔧 Langkah Deploy

### 1. Setup Environment Variables di Vercel Dashboard

Setelah project dibuat di Vercel, tambahkan environment variables berikut:

**Database:**
```
DATABASE_URL = your_supabase_connection_string
```

**JWT Secrets:**
Generate dengan command:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Lalu set:
```
JWT_SECRET = hasil_generate_64_karakter
JWT_REFRESH_SECRET = hasil_generate_64_karakter_lainnya
```

**Frontend URL:**
```
FRONTEND_URL = https://your-app-name.vercel.app
```

**Rate Limiting:**
```
RATE_LIMIT_WINDOW_MS = 900000
RATE_LIMIT_MAX_REQUESTS = 100
RATE_LIMIT_AUTH_MAX = 5
```

**Midtrans:**
```
MIDTRANS_SERVER_KEY = your_midtrans_server_key
MIDTRANS_CLIENT_KEY = your_midtrans_client_key
MIDTRANS_IS_PRODUCTION = false
```

### 2. Deploy via Vercel Dashboard

#### Opsi A: Deploy dari GitHub
1. Push code ke GitHub repository
2. Buka https://vercel.com/new
3. Import repository GitHub Anda
4. Vercel akan auto-detect `vercel.json` config
5. Tambahkan environment variables (lihat langkah 1)
6. Click "Deploy"

#### Opsi B: Deploy via Vercel CLI
1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login ke Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   cd eventkampus-frontend
   vercel
   ```

4. Follow prompts dan set environment variables

### 3. Update CORS di Production

Setelah deploy, update `allowedOrigins` di `api/index.js` untuk include production URL:
```javascript
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5174',
  'http://localhost:5173',
  'http://localhost:5175',
  /\.vercel\.app$/ // Ini sudah include semua Vercel URLs
];
```

### 4. Test Production

Test endpoints berikut:
- ✅ `https://your-app.vercel.app/api/events` - List events
- ✅ `https://your-app.vercel.app/api/auth/login` - Login
- ✅ `https://your-app.vercel.app/api/auth/register` - Register

## 🔍 Troubleshooting

### Error: "JWT_SECRET tidak ditemukan"
**Solusi:** Pastikan environment variable `JWT_SECRET` sudah di-set di Vercel Dashboard dengan minimal 32 karakter.

### Error: CORS Policy
**Solusi:** 
1. Check `FRONTEND_URL` environment variable
2. Pastikan production URL sudah di-include di `allowedOrigins`
3. Redeploy setelah update config

### Error: Database Connection Timeout
**Solusi:** 
1. Check `DATABASE_URL` di environment variables
2. Pastikan Supabase connection string benar
3. Serverless functions punya timeout 10 detik default

### Error: Midtrans Payment Tidak Jalan
**Solusi:**
1. Pastikan `MIDTRANS_SERVER_KEY` dan `MIDTRANS_CLIENT_KEY` sudah benar
2. Check apakah `MIDTRANS_IS_PRODUCTION` sesuai (false untuk sandbox)
3. Pastikan Midtrans webhook URL di-set ke: `https://your-app.vercel.app/api/payment/notification`

## 📊 Monitoring

- **Logs:** Check di Vercel Dashboard > Your Project > Deployments > View Function Logs
- **Analytics:** Vercel Dashboard > Your Project > Analytics
- **Performance:** Vercel Dashboard > Your Project > Speed Insights

## 🔒 Security Checklist

- ✅ JWT_SECRET di-generate dengan crypto (64+ karakter)
- ✅ Environment variables tidak di-commit ke Git
- ✅ CORS hanya allow production domain
- ✅ Rate limiting aktif
- ✅ Input validation dengan express-validator
- ✅ Password di-hash dengan bcrypt (salt rounds 12)
- ✅ Helmet security headers aktif

## 📝 Notes

- Vercel serverless functions punya limit:
  - Execution time: 10s (Hobby), 60s (Pro)
  - Memory: 1024 MB (Hobby), configurable (Pro)
  - Payload: 5 MB

- Database connection pool di-set ke `max: 1` untuk serverless optimization

- Hot reload tidak available di production (serverless nature)

## 🆘 Support

Jika ada masalah:
1. Check Vercel function logs
2. Check Supabase logs untuk database issues
3. Test locally dulu dengan `vercel dev`
