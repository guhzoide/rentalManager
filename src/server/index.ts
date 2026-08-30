import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trpcServer } from '@hono/trpc-server';
import { serveStatic } from 'hono/bun';
import { appRouter } from './routers/_app.js';
import { createContext } from './trpc.js';
import { auth } from './auth.js';

export const app = new Hono();

const trustedOrigins = ['http://localhost:5173', 'http://localhost:3000'];
let applicationUrl = process.env.BETTER_AUTH_URL?.trim() || '';
if (applicationUrl && !applicationUrl.startsWith('http://') && !applicationUrl.startsWith('https://')) {
  applicationUrl = `https://${applicationUrl}`;
}
if (applicationUrl) {
  trustedOrigins.push(applicationUrl.replace(/\/$/, ''));
}

app.use(
  '*',
  cors({
    origin: trustedOrigins,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.get('/health', (c) => c.json({ status: 'ok', app: 'Rental System API' }));

app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  return auth.handler(c.req.raw);
});

app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: (_opts, c) => createContext({ req: c.req.raw }),
  })
);

// Produção em container: API e SPA são entregues pelo mesmo processo Bun.
app.use('/assets/*', serveStatic({ root: './dist' }));
app.use('/favicon.svg', serveStatic({ root: './dist' }));
app.get('*', serveStatic({ path: './dist/index.html' }));

const port = parseInt(process.env.PORT || '3001');

export default {
  port,
  fetch: app.fetch,
};
