import { prisma } from '../trpc';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';

const TABLES_WITH_PASSWORD = ['usuarios'];
const TABLES_OMIT_PASSWORD: Record<string, string[]> = {
  usuarios: ['senha'],
};

function getPrismaModel(table: string): any {
  const modelMap: Record<string, any> = {
    clientes: (prisma as any).clientes,
    enderecos: (prisma as any).enderecos,
    estoques: (prisma as any).estoques,
    usuarios: (prisma as any).usuarios,
    agendas: (prisma as any).agendas,
  };

  const model = modelMap[table.toLowerCase()];
  if (!model) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Tabela "${table}" não encontrada.`,
    });
  }
  return model;
}

export async function genericRead(input: any) {
  const model = getPrismaModel(input.table);
  const page = input.pagina || 1;
  const limit = input.limit || 50;
  const skip = (page - 1) * limit;

  const [total, data] = await Promise.all([
    model.count({ where: input.filtros || {} }),
    model.findMany({
      where: input.filtros || {},
      include: input.include,
      select: input.select,
      orderBy: input.orderBy || { id: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return {
    data,
    total,
    pagina: page,
    limit,
    totalPaginas: Math.ceil(total / limit),
  };
}

export async function genericCreate(input: any) {
  const model = getPrismaModel(input.table);
  const items = Array.isArray(input.Itens) ? input.Itens : [input.Itens];
  const results = [];

  for (const item of items) {
    const { id, createdAt, updatedAt, ...data } = item;
    
    // Hash password if needed
    if (TABLES_WITH_PASSWORD.includes(input.table.toLowerCase()) && data.senha) {
      data.senha = await bcrypt.hash(data.senha, 10);
    }

    if (id) {
      results.push(await model.update({ where: { id }, data, include: input.include }));
    } else {
      results.push(await model.create({ data, include: input.include }));
    }
  }

  return results.length === 1 ? results[0] : results;
}

export async function genericDelete(input: any) {
  const model = getPrismaModel(input.table);
  const filters = Array.isArray(input.Filtros) ? input.Filtros : [input.Filtros];
  const results = [];

  for (const filtro of filters) {
    results.push(await model.delete({ where: filtro }));
  }

  return results.length === 1 ? results[0] : results;
}
