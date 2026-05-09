import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './routers/_app';
import { createContext } from './trpc';

const app = new Hono();

app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })
);

app.get('/', (c) => c.json({ status: 'ok', app: 'Rental System API' }));

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
