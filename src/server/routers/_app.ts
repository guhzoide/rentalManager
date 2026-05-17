import { router } from '../trpc';
import { clienteRouter } from './clientes';
import { estoqueRouter } from './estoque';
import { usuarioRouter } from './usuarios';
import { agendaRouter } from './agendas';
import { enderecoRouter } from './enderecos';

export const appRouter = router({
  clientes: clienteRouter,
  estoque: estoqueRouter,
  usuarios: usuarioRouter,
  agendas: agendaRouter,
  enderecos: enderecoRouter,
});



export type AppRouter = typeof appRouter;

