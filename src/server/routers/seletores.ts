import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { moduleProcedure, router } from '../trpc.js';
import type { RemoteOption } from '../../lib/remoteOptions.js';

export const selectorSchema = z.object({
    busca: z.string().trim().max(100).default(''),
    cursor: z.string().min(1).max(100).nullish(),
    limit: z.number().int().min(1).max(50).default(30),
    ids: z.array(z.string().min(1).max(100)).max(200).optional(),
    clienteId: z.string().min(1).optional(),
});
type SelectorInput = z.infer<typeof selectorSchema>;
const contains = (value: string) => ({ contains: value, mode: 'insensitive' as const });
const bounds = (input: SelectorInput) => ({ take: input.limit + 1, ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}) });
const orderBy = [{ nome: 'asc' as const }, { id: 'asc' as const }];
const ids = (input: SelectorInput) => input.ids ? { id: { in: input.ids } } : {};

function options(modules: string[], load: (db: PrismaClient, input: SelectorInput) => Promise<RemoteOption[]>) {
    return moduleProcedure(modules).input(selectorSchema).query(async ({ ctx, input }) => {
        const rows = await load(ctx.prisma, input);
        return { data: rows.slice(0, input.limit), nextCursor: rows.length > input.limit ? rows[input.limit - 1].id : undefined };
    });
}

export const seletoresRouter = router({
    agendas: options(['agenda', 'financeiro', 'canvas'], async (db, input) => {
        const rows = await db.agendas.findMany({
            where: { ...ids(input), ...(input.busca ? { OR: [
                { clientes: { nome: contains(input.busca) } }, { observacao: contains(input.busca) }, { id: contains(input.busca) },
            ] } : {}) },
            select: { id: true, clientes: { select: { nome: true } }, data: true, valorTotal: true },
            orderBy: [{ data: 'desc' }, { id: 'asc' }], ...bounds(input),
        });
        return rows.map((row) => ({ id: row.id, nome: `${row.clientes.nome} — ${row.data.toLocaleString('pt-BR')} — ${row.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` }));
    }),
    transacoes: options(['financeiro', 'canvas'], async (db, input) => {
        const rows = await db.transacoes.findMany({
            where: { ...ids(input), ...(input.busca ? { descricao: contains(input.busca) } : {}) },
            select: { id: true, descricao: true, data: true, valor: true },
            orderBy: [{ data: 'desc' }, { id: 'asc' }], ...bounds(input),
        });
        return rows.map((row) => ({ id: row.id, nome: `${row.descricao} — ${row.data.toLocaleDateString('pt-BR')} — ${row.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` }));
    }),
    empresas: options(['empresa', 'canvas'], (db, input) => db.empresas.findMany({
        where: { ...ids(input), ...(input.busca ? { nome: contains(input.busca) } : {}) },
        select: { id: true, nome: true }, orderBy, ...bounds(input),
    })),
    records: moduleProcedure('canvas').input(z.object({
        table: z.enum(['estoque', 'clientes', 'agendas', 'transacoes', 'empresas']),
        ids: z.array(z.string().min(1).max(100)).min(1).max(200),
    })).query(async ({ ctx, input }): Promise<Record<string, unknown>[]> => {
        const where = { id: { in: input.ids } };
        switch (input.table) {
            case 'estoque': return ctx.prisma.estoques.findMany({ where, include: { categoria: true } });
            case 'clientes': {
                const rows = await ctx.prisma.clientes.findMany({ where, include: { enderecos: true } });
                return rows.map(({ enderecos, ...row }) => {
                    const primary = enderecos.find((address) => address.principal) ?? enderecos[0];
                    return { ...row, cep: primary?.cep ?? '', bairro: primary?.bairro ?? '', rua: primary?.rua ?? '',
                        numero: primary?.numero ?? '', complemento: primary?.complemento ?? '', principal: primary?.principal ?? false };
                });
            }
            case 'agendas': return ctx.prisma.agendas.findMany({ where, include: { clientes: true, enderecos: true, itens: { include: { estoques: true } } } });
            case 'transacoes': return ctx.prisma.transacoes.findMany({ where });
            case 'empresas': return ctx.prisma.empresas.findMany({ where });
        }
    }),
    clientes: options(['agenda', 'clientes', 'financeiro', 'canvas'], (db, input) => db.clientes.findMany({
        where: { ...ids(input), ...(input.busca ? { OR: ['nome', 'cpf', 'email', 'contato'].map((field) => ({ [field]: contains(input.busca) })) } : {}) },
        select: { id: true, nome: true }, orderBy, ...bounds(input),
    })),
    itens: options(['agenda', 'estoque', 'canvas'], (db, input) => db.estoques.findMany({
        where: { ...ids(input), ...(input.busca ? { nome: contains(input.busca) } : {}) },
        select: { id: true, nome: true, disponivel: true, valorDiaria: true }, orderBy, ...bounds(input),
    })),
    categorias: options(['estoque', 'canvas'], (db, input) => db.categorias.findMany({
        where: { ...ids(input), ...(input.busca ? { nome: contains(input.busca) } : {}) },
        select: { id: true, nome: true }, orderBy, ...bounds(input),
    })),
    grupos: options(['usuarios', 'grupos'], async (db, input) => {
        const parsed = /^\d+$/.test(input.busca) ? Number(input.busca) : NaN;
        const code = Number.isSafeInteger(parsed) && parsed <= 2147483647 ? parsed : undefined;
        if (input.cursor && (!/^\d+$/.test(input.cursor) || Number(input.cursor) > 2147483647)) return [];
        const rows = await db.grupos.findMany({
            where: {
                ...(input.ids ? { codigo: { in: input.ids.map(Number).filter((value) => Number.isSafeInteger(value) && value > 0 && value <= 2147483647) } } : {}),
                ...(input.busca ? { OR: [{ nome: contains(input.busca) }, ...(code !== undefined ? [{ codigo: code }] : [])] } : {}),
            },
            select: { codigo: true, nome: true }, orderBy: [{ nome: 'asc' }, { codigo: 'asc' }], ...bounds(input),
            ...(input.cursor ? { cursor: { codigo: Number(input.cursor) } } : {}),
        });
        return rows.map((row) => ({ id: String(row.codigo), codigo: row.codigo, nome: `${row.codigo} — ${row.nome}` }));
    }),
    enderecos: options(['agenda', 'clientes'], async (db, input) => {
        if (!input.clienteId) return [];
        const rows = await db.enderecos.findMany({
            where: { clienteId: input.clienteId, ...ids(input), ...(input.busca ? {
                OR: ['rua', 'numero', 'bairro', 'cep', 'complemento'].map((field) => ({ [field]: contains(input.busca) })),
            } : {}) },
            select: { id: true, rua: true, numero: true, bairro: true, cep: true, complemento: true, clienteId: true },
            orderBy: [{ principal: 'desc' }, { rua: 'asc' }, { id: 'asc' }], ...bounds(input),
        });
        return rows.map((row) => ({ id: row.id, clienteId: row.clienteId,
            nome: [`${row.rua}, ${row.numero}`, row.complemento, row.bairro, row.cep && `CEP ${row.cep}`].filter(Boolean).join(' — '),
        }));
    }),
});
