import { z } from 'zod';

export const paginationSchema = z.object({
  pagina: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(50),
  filtros: z.record(z.string(), z.any()).optional(),
  orderBy: z.record(z.string(), z.any()).optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export async function getPaginatedResult<T>(
  model: any,
  input: PaginationInput,
  options: { include?: any; select?: any } = {}
) {
  const page = input.pagina;
  const limit = input.limit;
  const skip = (page - 1) * limit;

  const queryArgs: any = {
    where: input.filtros || {},
    orderBy: input.orderBy || { id: 'desc' },
    skip,
    take: limit,
  };

  if (options.include) {
    queryArgs.include = options.include;
  } else if (options.select) {
    queryArgs.select = options.select;
  }

  const [total, data] = await Promise.all([
    model.count({ where: input.filtros || {} }),
    model.findMany(queryArgs),
  ]);

  return {
    data: data as T[],
    total,
    pagina: page,
    limit,
    totalPaginas: Math.ceil(total / limit),
  };
}
