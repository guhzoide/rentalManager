import { router } from '../trpc.js';
import { clienteRouter } from './clientes.js';
import { estoqueRouter } from './estoque.js';
import { usuarioRouter } from './usuarios.js';
import { agendaRouter } from './agendas.js';
import { enderecoRouter } from './enderecos.js';
import { transacaoRouter } from './transacoes.js';

export const appRouter = router({
  clientes: clienteRouter,
  estoque: estoqueRouter,
  usuarios: usuarioRouter,
  agendas: agendaRouter,
  enderecos: enderecoRouter,
  transacoes: transacaoRouter,
});



export type AppRouter = typeof appRouter;

