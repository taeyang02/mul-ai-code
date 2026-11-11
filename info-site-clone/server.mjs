import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export function startServer(port = 5173, root = fileURLToPath(new URL('.', import.meta.url))) {
  let count = 0;
  const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.PNG':'image/png','.gif':'image/gif','.svg':'image/svg+xml','.ogg':'audio/ogg','.mp3':'audio/mpeg','.mp4':'video/mp4'};
  const server = http.createServer(async (req,res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/counter') {
      if (req.method === 'POST') count++;
      res.writeHead(200, {'Content-Type':'application/json'});
      return res.end(JSON.stringify({count}));
    }
    try {
      const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (!path.startsWith(resolve(root) + sep)) throw new Error('Invalid path');
      const body = await readFile(path);
      res.writeHead(200, {'Content-Type':types[extname(path)] || 'application/octet-stream'});
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(404); res.end('Not found');
    }
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await startServer(Number(process.env.PORT || 5173));
  console.log(`Local website: http://127.0.0.1:${server.address().port}`);
}
