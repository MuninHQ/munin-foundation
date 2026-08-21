import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const port=Number(process.env.MUNIN_WEB_PORT??5173);
const apiPort=Number(process.env.MUNIN_API_PORT??4310);
const root=resolve(process.env.MUNIN_WEB_ROOT??resolve(process.cwd(),'dist-web'));
const mime={'.css':'text/css; charset=utf-8','.html':'text/html; charset=utf-8','.ico':'image/x-icon','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};

function proxy(req,res){
  const upstream=httpRequest({host:'127.0.0.1',port:apiPort,path:req.url,method:req.method,headers:{...req.headers,host:`127.0.0.1:${apiPort}`}},reply=>{res.writeHead(reply.statusCode??502,{...reply.headers,'cache-control':'no-store'});reply.pipe(res)});
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502,{'content-type':'application/json'});res.end('{"error":"API unavailable"}')});req.pipe(upstream);
}
function serve(req,res){
  if(req.url?.startsWith('/api/'))return proxy(req,res);
  const pathname=decodeURIComponent(new URL(req.url??'/',`http://${req.headers.host??'localhost'}`).pathname);
  const file=resolve(root,pathname==='/'?'index.html':pathname.replace(/^\/+/,''));
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);return res.end('Forbidden')}
  if(!existsSync(file)||!statSync(file).isFile()){res.writeHead(404,{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'});return res.end('Not found')}
  res.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream','cache-control':'no-store'});createReadStream(file).pipe(res);
}
createServer(serve).listen(port,'0.0.0.0',()=>console.log(`[Munin Mobile Web] listening on http://0.0.0.0:${port}`));
