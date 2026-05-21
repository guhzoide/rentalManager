import { GenericValidator } from './index.js';

export const agendasValidator: GenericValidator = {
  // A reconciliação de estoque de múltiplos itens é gerenciada transacionalmente
  // e com precisão diretamente no roteador tRPC de agendas.
};
