import { prisma } from '../trpc';
import { TRPCError } from '@trpc/server';
import { hashPassword } from 'better-auth/crypto';
import { getValidator } from '../validation';

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
  const validator = getValidator(input.table.toLowerCase());

  for (const item of items) {
    const { id, createdAt, updatedAt, ...restData } = item;
    const data: any = { ...restData };
    
    // Hash password if needed
    if (TABLES_WITH_PASSWORD.includes(input.table.toLowerCase()) && data.senha) {
      data.senha = await hashPassword(data.senha);
    }

    if (validator?.validate) await validator.validate(data, prisma);
    if (validator?.beforeSave) await validator.beforeSave(data, prisma, input.table);

    if (id) {
      data.updatedAt = updatedAt ? new Date(updatedAt) : new Date();
      const result = await model.update({ where: { id }, data, include: input.include });
      results.push(result);
      if (validator?.afterSave) await validator.afterSave(result, prisma, input.table);
    } else {
      if (createdAt) data.createdAt = new Date(createdAt);
      data.updatedAt = updatedAt ? new Date(updatedAt) : new Date();
      const createdRecord = await model.create({ data, include: input.include });
      results.push(createdRecord);
      if (validator?.afterSave) await validator.afterSave(createdRecord, prisma, input.table);
    }
  }

  return results.length === 1 ? results[0] : results;
}

export async function genericDelete(input: any) {
  const model = getPrismaModel(input.table);
  const filters = Array.isArray(input.Filtros) ? input.Filtros : [input.Filtros];
  const results = [];
  const validator = getValidator(input.table.toLowerCase());

  for (const filtro of filters) {
    if (validator?.beforeDelete) await validator.beforeDelete(filtro, prisma, input.table);
    const result = await model.delete({ where: filtro });
    results.push(result);
    if (validator?.afterDelete) await validator.afterDelete(result, prisma, input.table);
  }

  return results.length === 1 ? results[0] : results;
}
