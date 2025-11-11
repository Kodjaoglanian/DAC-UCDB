const http = require('http');
const { readFile, stat } = require('fs/promises');
const path = require('path');
const { fetchPeople } = require('./src/database');

// Carregar variáveis de ambiente do .env
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  try {
    // Fast-return for browser favicon requests to avoid noisy ENOENT logs
    if (req.url === '/favicon.ico') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.url === '/api/pessoas') {
      if (req.method !== 'GET') {
        res.writeHead(405, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({ error: 'Método não permitido' }));
        return;
      }

      const pessoas = await fetchPeople();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
      res.end(JSON.stringify({ data: pessoas }));
      return;
    }

    const urlPath = req.url === '/' ? '/index.html' : req.url;
    const filePath = path.join(PUBLIC_DIR, path.normalize(urlPath));

    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('Arquivo não encontrado');
      return;
    }

    const fileExt = path.extname(filePath);
    const mimeType = MIME_TYPES[fileExt] || 'application/octet-stream';
    const fileContents = await readFile(filePath);

    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(fileContents);
  } catch (error) {
    // Log full error server-side for debugging
    console.error('Request handling error:', error && error.stack ? error.stack : error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' });
    res.end(JSON.stringify({ error: 'Erro ao processar a solicitação', details: error.message }));
  }
});

server.listen(PORT, () => {
  console.log(`Dashboard disponível em http://localhost:${PORT}`);
});
