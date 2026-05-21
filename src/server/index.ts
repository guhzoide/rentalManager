import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './routers/_app.js';
import { createContext } from './trpc.js';
import { auth } from './auth.js';

export const app = new Hono();

app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.get('/', (c) => c.json({ status: 'ok', app: 'Rental System API' }));

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

const port = parseInt(process.env.PORT || '3001');
console.log(`\n🚀 Rental System API rodando em http://localhost:${port}\n`);

export default {
  port,
  fetch: app.fetch,
};