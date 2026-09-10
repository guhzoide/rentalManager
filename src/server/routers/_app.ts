import { router } from '../trpc.js';
import { clienteRouter } from './clientes.js';
import { estoqueRouter } from './estoque.js';
import { usuarioRouter } from './usuarios.js';
import { agendaRouter } from './agendas.js';
import { enderecoRouter } from './enderecos.js';
import { transacaoRouter } from './transacoes.js';
import { empresaRouter } from './empresa.js';
import { documentoRouter } from './documentos.js';
import { grupoRouter } from './grupos.js';
import { deployRouter } from './deploy.js';
export const appRouter = router({
  deploy: deployRouter,
  clientes: clienteRouter,
  estoque: estoqueRouter,
  usuarios: usuarioRouter,
  agendas: agendaRouter,
  enderecos: enderecoRouter,
  transacoes: transacaoRouter,
  empresa: empresaRouter,
  documentos: documentoRouter,
  grupos: grupoRouter,
});



export type AppRouter = typeof appRouter;
