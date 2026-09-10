import 'dotenv/config';
import { initTRPC, TRPCError } from '@trpc/server';
import { prisma } from './db.js';
import { auth } from './auth.js';

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
  const isDeployRequest = url?.pathname.includes('/trpc/deploy.');
  if (!isDeployRequest) {
    try {
      session = await auth.api.getSession({
        headers: opts?.req?.headers || new Headers(),
      });
    } catch (err) {
      console.error('Erro ao ler sessão no tRPC context:', err);
    }
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
export const moduleProcedure = (moduleIds: string | string[]) => protectedProcedure.use(
  t.middleware(async ({ next, ctx }) => {
    const required = Array.isArray(moduleIds) ? moduleIds : [moduleIds];
    let allowed = (ctx.session?.user as { allowedPages?: string[] } | undefined)?.allowedPages;
    if (!allowed) {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session!.user.id },
        select: { grupoCodigo: true, master: true },
      });
      if (user?.master) return next();
      if (!user?.grupoCodigo) allowed = [];
      else {
        const group = await ctx.prisma.grupos.findUnique({ where: { codigo: user.grupoCodigo } });
        allowed = group?.moduloIds ?? [];
      }
    }
    if (allowed && !required.some((moduleId) => allowed.includes(moduleId))) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Seu grupo não possui acesso a este módulo.' });
    }
    return next();
  }),
);
