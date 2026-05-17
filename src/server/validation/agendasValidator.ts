import { GenericValidator } from './index';

export const agendasValidator: GenericValidator = {
  beforeSave: async (data: any, prisma: any) => {
    if (!data.id) {
      // Novo agendamento: verificar e reduzir disponibilidade
      const estoque = await prisma.estoques.findUnique({ where: { id: data.itemId } });
      if (!estoque || estoque.disponivel <= 0) {
        throw new Error('Item indisponível no estoque para locação.');
      }
      await prisma.estoques.update({
        where: { id: data.itemId },
        data: { disponivel: { decrement: 1 } }
      });
    } else {
      // Edição: verificar se o item mudou
      const oldAgenda = await prisma.agendas.findUnique({ where: { id: data.id } });
      if (oldAgenda && oldAgenda.itemId !== data.itemId) {
        // Devolve pro estoque antigo
        await prisma.estoques.update({
          where: { id: oldAgenda.itemId },
          data: { disponivel: { increment: 1 } }
        });

        // Tira do novo
        const newEstoque = await prisma.estoques.findUnique({ where: { id: data.itemId } });
        if (!newEstoque || newEstoque.disponivel <= 0) {
          throw new Error('Novo item indisponível no estoque para locação.');
        }
        await prisma.estoques.update({
          where: { id: data.itemId },
          data: { disponivel: { decrement: 1 } }
        });
      }
    }
  },

  afterDelete: async (record: any, prisma: any) => {
    // Remover agendamento: devolver disponibilidade
    await prisma.estoques.update({
      where: { id: record.itemId },
      data: { disponivel: { increment: 1 } }
    });
  }
};
