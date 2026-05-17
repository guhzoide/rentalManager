import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { prisma } from '../trpc';
import { paginationSchema, getPaginatedResult } from '../utils/pagination';
import bcrypt from 'bcryptjs';

const usuarioInputSchema = z.object({
  nome: z.string().min(3),
  loginName: z.string().min(3),
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

import { type usuarios } from '@prisma/client';

export const usuarioRouter = router({
  list: publicProcedure
    .input(paginationSchema)
    .query(async ({ input }) => {
      return getPaginatedResult<usuarios>(prisma.usuarios, input, {
        select: {
          id: true,
          nome: true,
          loginName: true,
          email: true,
          createdAt: true,
          updatedAt: true,
          // Senha omitida propositalmente
        }
      });
    }),

  create: publicProcedure
    .input(usuarioInputSchema)
    .mutation(async ({ input }) => {
      const hashedPassword = await bcrypt.hash(input.senha, 10);
      return prisma.usuarios.create({
        data: {
          ...input,
          senha: hashedPassword,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          nome: true,
          email: true,
        }
      });
    }),

  update: publicProcedure
    .input(z.object({
      id: z.number(),
      data: usuarioInputSchema.partial(),
    }))
    .mutation(async ({ input }) => {
      const updateData = { ...input.data, updatedAt: new Date() };
      
      if (updateData.senha) {
        updateData.senha = await bcrypt.hash(updateData.senha, 10);
      }

      return prisma.usuarios.update({
        where: { id: input.id },
        data: updateData,
        select: {
          id: true,
          nome: true,
          email: true,
        }
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return prisma.usuarios.delete({
        where: { id: input.id },
      });
    }),
});
