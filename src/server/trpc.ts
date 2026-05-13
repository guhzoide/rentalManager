import { initTRPC, TRPCError } from '@trpc/server';
import { PrismaClient } from '@prisma/client';

// ─── Prisma ───────────────────────────────────────────────────────────────────
export const prisma = new PrismaClient();

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

  return {
    prisma,
    req: opts?.req,
    rawBody,
    table,
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

// ─── Exports ──────────────────────────────────────────────────────────────────
export const router = t.router;
export const publicProcedure = t.procedure.use(loggerMiddleware);
export const protectedProcedure = t.procedure.use(loggerMiddleware); // Simplificado sem auth por enquanto
