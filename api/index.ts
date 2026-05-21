import { handle } from 'hono/vercel';
import { app } from '../src/server/index.js';

// Force Vercel rebuild to clear stale serverless function cache
export default handle(app);
