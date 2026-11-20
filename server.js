const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PORT = process.env.PORT || 4500;
const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_PATH = path.join(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function getLanUrls(port) {
  const nets = os.networkInterfaces();
  const urls = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        urls.push(`http://${net.address}:${port}`);
      }
    }
  }
  return urls;
}

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return { settings: {}, vendors: [], units: [], batches: [] };
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB:', err);
    return { settings: {}, vendors: [], units: [], batches: [] };
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalLen = 0;
    req.on('data', (chunk) => {
      totalLen += chunk.length;
      if (totalLen > 120 * 1024 * 1024) {
        reject(new Error('Payload terlalu besar (Maks 120MB)'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const str = Buffer.concat(chunks).toString('utf8');
        resolve(str ? JSON.parse(str) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf'
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // API ROUTES
  if (pathname === '/api/state' && req.method === 'GET') {
    const db = readDb();
    return sendJson(res, 200, {
      ...db,
      serverInfo: {
        port: PORT,
        localUrl: `http://localhost:${PORT}`,
        lanUrls: getLanUrls(PORT),
        timestamp: new Date().toISOString()
      }
    });
  }

  if (pathname === '/api/save-state' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const db = readDb();
      if (body.settings) db.settings = body.settings;
      if (Array.isArray(body.vendors)) db.vendors = body.vendors;
      if (Array.isArray(body.units)) db.units = body.units;
      if (Array.isArray(body.batches)) db.batches = body.batches;
      writeDb(db);
      return sendJson(res, 200, { ok: true, message: 'Data berhasil disimpan ke server.' });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  if (pathname === '/api/upload' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { dataUrl, prefix = 'img' } = body;
      if (!dataUrl || typeof dataUrl !== 'string') {
        return sendJson(res, 400, { ok: false, error: 'dataUrl kosong' });
      }
      const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (!match) {
        return sendJson(res, 400, { ok: false, error: 'Format gambar tidak valid' });
      }
      let ext = match[1].toLowerCase();
      if (ext === 'jpeg') ext = 'jpg';
      if (ext === 'svg+xml') ext = 'svg';
      const base64Data = match[2];
      const safePrefix = String(prefix).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
      const filename = `${safePrefix}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      return sendJson(res, 200, { ok: true, url: `/uploads/${filename}` });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  if (pathname === '/api/import-merge' && req.method === 'POST') {
    try {
      const incoming = await parseBody(req);
      const db = readDb();

      // Merge Vendors
      if (Array.isArray(incoming.vendors)) {
        for (const v of incoming.vendors) {
          const idx = db.vendors.findIndex((x) => x.id === v.id);
          if (idx >= 0) db.vendors[idx] = { ...db.vendors[idx], ...v };
          else db.vendors.push(v);
        }
      }

      // Merge Units
      if (Array.isArray(incoming.units)) {
        for (const u of incoming.units) {
          const idx = db.units.findIndex((x) => x.id === u.id);
          if (idx >= 0) db.units[idx] = { ...db.units[idx], ...u };
          else db.units.push(u);
        }
      }

      // Merge Batches
      if (Array.isArray(incoming.batches)) {
        for (const b of incoming.batches) {
          const idx = db.batches.findIndex((x) => x.id === b.id);
          if (idx >= 0) db.batches[idx] = { ...db.batches[idx], ...b };
          else db.batches.push(b);
        }
      }

      writeDb(db);
      return sendJson(res, 200, { ok: true, db });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  // Serve reference PDFs from root workspace if requested
  if (pathname.startsWith('/ref-pdf/')) {
    const pdfName = pathname.replace('/ref-pdf/', '');
    const safePdfPath = path.join(ROOT_DIR, path.basename(pdfName));
    if (fs.existsSync(safePdfPath) && safePdfPath.toLowerCase().endsWith('.pdf')) {
      res.writeHead(200, { 'Content-Type': 'application/pdf' });
      return fs.createReadStream(safePdfPath).pipe(res);
    }
  }

  // Serve Static Files from public/
  let relPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, relPath));
  if (!filePath.toLowerCase().startsWith(PUBLIC_DIR.toLowerCase())) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    return fs.createReadStream(filePath).pipe(res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  const lanUrls = getLanUrls(PORT);
  console.log('==============================================================');
  console.log('  APLIKASI PENCAIRAN & PEMANTAUAN PROGRES HUNTARA BNPB');
  console.log('==============================================================');
  console.log(`  Akses di Laptop Ini : http://localhost:${PORT}`);
  if (lanUrls.length > 0) {
    console.log(`  Sharing WiFi / LAN  : ${lanUrls.join(' atau ')}`);
  }
  console.log('==============================================================');
});

