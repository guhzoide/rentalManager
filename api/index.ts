import { handle } from 'hono/vercel';
import { app } from '../src/server/index';

export default handle(app);
