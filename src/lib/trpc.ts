import { createTRPCReact } from '@trpc/react-query';
import { httpLink } from '@trpc/client';

// Importa o tipo do AppRouter do server — apenas tipos, não o código
import type { AppRouter } from '../server/routers/_app';

export { type AppRouter };

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: '/trpc',
    }),
  ],
});
