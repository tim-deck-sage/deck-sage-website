const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.resolve(__dirname, '../../out');
const portFlag = process.argv.indexOf('--port');
const port = Number(portFlag >= 0 ? process.argv[portFlag + 1] : process.env.PORT || 4184);
const types = {
  '.mjs': 'application/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.css': 'text/css; charset=utf-8',
  '.gz': 'application/octet-stream',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error(`Invalid preview port: ${port}`);
}

const server = http.createServer((request, response) => {
  try {
    let relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (relative.endsWith('/')) relative += 'index.html';
    const file = path.resolve(root, `.${relative}`);
    if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    const stat = fs.statSync(file);
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': stat.size,
      'Content-Type': types[path.extname(file)] || 'application/octet-stream'
    });
    fs.createReadStream(file, { highWaterMark: 65536 }).pipe(response);
  } catch {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Deck Sage homepage preview: http://127.0.0.1:${port}/#/home`);
});
