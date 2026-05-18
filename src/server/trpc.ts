import 'dotenv/config';
import { initTRPC, TRPCError } from '@trpc/server';
import { prisma } from './db';
import { auth } from './auth';

export { prisma };

// ─── Context ──────────────────────────────────────────────────────────────────
export const createContext = async (opts?: any) => {
  let rawBody: any = undefined;

  if (opts?.req instanceof Request) {
    try {
      const cloned = opts.req.clone();
      const text = await cloned.text();
      if (text) rawBody = JSON.parse(text);
    } catch {
      rawBody = undefined;
    }
  }

  const url = opts?.req?.url ? new URL(opts.req.url) : null;
  const table = url?.searchParams.get('table') || undefined;

  let session = null;
  try {
    session = await auth.api.getSession({
      headers: opts?.req?.headers || new Headers(),
    });
  } catch (err) {
    console.error('Erro ao ler sessão no tRPC context:', err);
  }

  return {
    prisma,
    req: opts?.req,
    rawBody,
    table,
    session,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

// ─── tRPC init ────────────────────────────────────────────────────────────────
const t = initTRPC.context<Context>().create();

// ─── Middleware ───────────────────────────────────────────────────────────────
const loggerMiddleware = t.middleware(async (opts) => {
  const start = Date.now();
  const result = await opts.next();
  const duration = Date.now() - start;
  console.log(`[${opts.type.toUpperCase()}] ${opts.path} — ${duration}ms`);
  return result;
});

const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Você precisa estar logado para acessar este recurso.',
    });
  }
  return next({
    ctx: {
      session: ctx.session,
    },
  });
});

// ─── Exports ──────────────────────────────────────────────────────────────────
export const router = t.router;
export const publicProcedure = t.procedure.use(loggerMiddleware);
export const protectedProcedure = t.procedure.use(loggerMiddleware).use(isAuthed);
