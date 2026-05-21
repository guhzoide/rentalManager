import { GenericValidator } from './index.js';

export const estoquesValidator: GenericValidator = {
  beforeSave: async (data: any) => {
    // Na criação, definir disponivel igual a quantidade, se não for explicitamente enviado
    if (!data.id && data.quantidade !== undefined && data.disponivel === undefined) {
      data.disponivel = data.quantidade;
    }
  }
};
