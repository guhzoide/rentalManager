import { GenericValidator } from './index.js';

export const clientesValidator: GenericValidator = {
  afterSave: async (record: any, tx: any) => {
    // Sincronizar o endereço principal para a tabela enderecos
    // Verifica se já existe para evitar duplicidade em atualizações
    const existing = await tx.enderecos.findFirst({ where: { clienteId: record.id } });
    if (!existing) {
      await tx.enderecos.create({
        data: {
          clienteId: record.id,
          cep: record.cep || '',
          rua: record.rua || '',
          numero: record.numero || '',
          bairro: record.bairro || '',
          updatedAt: new Date()
        }
      });
    }
  }
};
