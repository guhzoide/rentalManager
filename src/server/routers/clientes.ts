import { z } from 'zod';
import { protectedProcedure, router } from '../trpc.js';
import { prisma } from '../trpc.js';
import { paginationSchema, getPaginatedResult } from '../utils/pagination.js';
import { clienteSchema } from '../../lib/schemas.js';


import { type clientes } from '@prisma/client';

export const clienteRouter = router({
  list: protectedProcedure
    .input(paginationSchema)
    .query(async ({ input }) => {
      // Fetch paginated clients including their enderecos relation
      const result = await getPaginatedResult<clientes>(prisma.clientes, input, {
        include: {
          enderecos: true,
        }
      });

      // Map each client to include primary address fields for grid compatibility
      const mappedData = result.data.map((c: any) => {
        const primary = c.enderecos?.find((e: any) => e.principal === true) || c.enderecos?.[0];
        return {
          id: c.id,
          nome: c.nome,
          cpf: c.cpf,
          email: c.email,
          contato: c.contato,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          cep: primary?.cep || '',
          bairro: primary?.bairro || '',
          rua: primary?.rua || '',
          numero: primary?.numero || '',
          complemento: primary?.complemento || '',
          principal: primary?.principal || false,
        };
      });

      return {
        ...result,
        data: mappedData,
      };
    }),

  create: protectedProcedure
    .input(clienteSchema)
    .mutation(async ({ input }) => {
      const { cep, bairro, rua, numero, complemento, principal, ...clienteData } = input;

      const client = await prisma.clientes.create({
        data: {
          ...clienteData,
          updatedAt: new Date(),
        },
      });

      // Automatically save the primary address to enderecos table if provided
      if (cep || bairro || rua || numero) {
        try {
          if (principal) {
            await prisma.enderecos.updateMany({
              where: { clienteId: client.id, principal: true },
              data: { principal: false }
            });
          }

          await prisma.enderecos.create({
            data: {
              clienteId: client.id,
              cep: cep || '',
              bairro: bairro || '',
              rua: rua || '',
              numero: numero || '',
              complemento: complemento || '',
              principal: principal,
              updatedAt: new Date(),
            }
          });
        } catch (err) {
          console.error("Erro ao criar endereço principal:", err);
        }
      }

      return client;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: clienteSchema.partial(),
    }))
    .mutation(async ({ input }) => {
      const { cep, bairro, rua, numero, complemento, principal, ...clienteData } = input.data;

      const client = await prisma.clientes.update({
        where: { id: input.id },
        data: {
          ...clienteData,
          updatedAt: new Date(),
        },
      });

      // Sync updated primary address to enderecos table
      if (cep !== undefined || bairro !== undefined || rua !== undefined || numero !== undefined || complemento !== undefined || principal !== undefined) {
        try {
          const isSettingPrincipal = principal === true;

          if (isSettingPrincipal) {
            await prisma.enderecos.updateMany({
              where: { clienteId: input.id, principal: true },
              data: { principal: false }
            });
          }

          const primaryAddr = await prisma.enderecos.findFirst({
            where: {
              clienteId: input.id,
              complemento: 'Principal'
            }
          });

          if (primaryAddr) {
            await prisma.enderecos.update({
              where: { id: primaryAddr.id },
              data: {
                cep: cep !== undefined ? (cep || '') : primaryAddr.cep,
                bairro: bairro !== undefined ? (bairro || '') : primaryAddr.bairro,
                rua: rua !== undefined ? (rua || '') : primaryAddr.rua,
                numero: numero !== undefined ? (numero || '') : primaryAddr.numero,
                complemento: complemento !== undefined ? (complemento || '') : primaryAddr.complemento,
                principal: principal !== undefined ? principal : primaryAddr.principal,
                updatedAt: new Date(),
              }
            });
          } else if (cep || bairro || rua || numero) {
            // Create if it didn't exist historically and some address field is filled
            await prisma.enderecos.create({
              data: {
                clienteId: input.id,
                cep: cep ?? '',
                bairro: bairro ?? '',
                rua: rua ?? '',
                numero: numero ?? '',
                complemento: complemento ?? '',
                principal: principal ?? true,
                updatedAt: new Date(),
              }
            });
          }
        } catch (err) {
          console.error("Erro ao atualizar endereço principal:", err);
        }
      }

      return client;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.clientes.delete({
        where: { id: input.id },
      });
    }),
});
