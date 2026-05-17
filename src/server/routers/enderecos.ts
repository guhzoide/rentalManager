import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { prisma } from '../trpc';
import { paginationSchema, getPaginatedResult } from '../utils/pagination';

const enderecoInputSchema = z.object({
  clienteId: z.number().int(),
  cep: z.string().min(8),
  bairro: z.string().optional().nullable(),
  rua: z.string().min(1),
  numero: z.string().min(1),
  complemento: z.string().optional().nullable(),
  principal: z.boolean(),
});

import { type enderecos } from '@prisma/client';

export const enderecoRouter = router({
  list: publicProcedure
    .input(paginationSchema)
    .query(async ({ input }) => {
      return getPaginatedResult<enderecos>(prisma.enderecos, input);
    }),

  byClienteId: publicProcedure
    .input(z.object({ clienteId: z.number().int() }))
    .query(async ({ input }) => {
      return prisma.enderecos.findMany({
        where: { clienteId: input.clienteId },
        orderBy: { id: 'asc' },
      });
    }),

  create: publicProcedure
    .input(enderecoInputSchema)
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

  update: publicProcedure
    .input(z.object({
      id: z.number(),
      data: enderecoInputSchema.partial(),
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

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return prisma.enderecos.delete({
        where: { id: input.id },
      });
    }),
});
