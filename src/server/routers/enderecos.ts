import { z } from 'zod';
import { moduleProcedure, router } from '../trpc.js';
import { prisma } from '../trpc.js';
import { paginationSchema, getPaginatedResult } from '../utils/pagination.js';
import { enderecoSchema } from '../../lib/schemas.js';


import { type enderecos } from '@prisma/client';

export const enderecoRouter = router({
  list: moduleProcedure(['clientes', 'agenda'])
    .input(paginationSchema)
    .query(async ({ input }) => {
      return getPaginatedResult<enderecos>(prisma.enderecos, input);
    }),

  byClienteId: moduleProcedure(['clientes', 'agenda'])
    .input(z.object({ clienteId: z.string() }))
    .query(async ({ input }) => {
      return prisma.enderecos.findMany({
        where: { clienteId: input.clienteId },
        orderBy: { id: 'asc' },
      });
    }),

  create: moduleProcedure('clientes')
    .input(enderecoSchema)
    .mutation(async ({ input }) => {
      // If this new address is primary, toggle off all other addresses for this customer first
      if (input.principal) {
        await prisma.enderecos.updateMany({
          where: { clienteId: input.clienteId, principal: true },
          data: { principal: false }
        });
      }

      return prisma.enderecos.create({
        data: {
          ...input,
          updatedAt: new Date(),
        },
      });
    }),

  update: moduleProcedure('clientes')
    .input(z.object({
      id: z.string(),
      data: enderecoSchema.partial(),
    }))
    .mutation(async ({ input }) => {
      // If this address is being updated to primary, toggle off all other addresses for this customer first
      if (input.data.principal === true) {
        const addr = await prisma.enderecos.findUnique({
          where: { id: input.id },
          select: { clienteId: true }
        });
        if (addr) {
          await prisma.enderecos.updateMany({
            where: { clienteId: addr.clienteId, principal: true, NOT: { id: input.id } },
            data: { principal: false }
          });
        }
      }

      return prisma.enderecos.update({
        where: { id: input.id },
        data: {
          ...input.data,
          updatedAt: new Date(),
        },
      });
    }),

  delete: moduleProcedure('clientes')
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.enderecos.delete({
        where: { id: input.id },
      });
    }),
});
