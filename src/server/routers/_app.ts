import { router } from '../trpc.js';
import { clienteRouter } from './clientes.js';
import { estoqueRouter } from './estoque.js';
import { usuarioRouter } from './usuarios.js';
import { agendaRouter } from './agendas.js';
import { enderecoRouter } from './enderecos.js';
import { transacaoRouter } from './transacoes.js';
import { empresaRouter } from './empresa.js';

export const appRouter = router({
  clientes: clienteRouter,
  estoque: estoqueRouter,
  usuarios: usuarioRouter,
  agendas: agendaRouter,
  enderecos: enderecoRouter,
  transacoes: transacaoRouter,
  empresa: empresaRouter,
});



export type AppRouter = typeof appRouter;

