import { handle } from 'hono/vercel';
import { app } from '../src/server/index.js';

export default handle(app);
