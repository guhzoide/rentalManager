import { handle } from 'hono/vercel';
import { app } from '../src/server/index.js';

// Force Vercel rebuild for auth update trailing slash
const handler = handle(app);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const PATCH = handler;
