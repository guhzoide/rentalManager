import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { AGENDA_WARNING_MS } from './agendaStatus.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const textFilter = z.string().trim().max(100).optional();
export const agendaColumnFiltersSchema = z.object({
    itens: textFilter,
    cliente: textFilter,
    endereco: textFilter,
    observacao: textFilter,
    data: z.iso.date().optional(),
    dataColeta: z.iso.date().optional(),
    valorTotal: z.string().refine((value) => value.trim() !== '' && Number.isFinite(Number(value)), 'Valor inválido').optional(),
    entregue: z.enum(['true', 'false']).optional(),
    concluida: z.enum(['true', 'false']).optional(),
    status: z.enum(['danger', 'warning', 'success', 'pending']).optional(),
}).strict();

export const agendaSortKeys = ['cliente', 'endereco', 'data', 'dataColeta', 'valorTotal', 'observacao', 'entregue', 'concluida'] as const;
export const agendaSortSchema = z.object({
    key: z.string().pipe(z.enum(agendaSortKeys)),
    direction: z.enum(['asc', 'desc']),
});

export const agendaFiltersSchema = z.object({
    concluida: z.boolean().default(false),
    clienteId: z.string().min(1).optional(),
    itemId: z.string().min(1).optional(),
    inicio: z.coerce.date().optional(),
    fim: z.coerce.date().optional(),
    colunas: agendaColumnFiltersSchema.optional(),
});

export const agendaSearchSchema = agendaFiltersSchema.extend({
    pagina: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sort: agendaSortSchema.optional(),
});

export function agendaOrderBy(sort?: z.output<typeof agendaSortSchema>): Prisma.agendasOrderByWithRelationInput[] {
    if (!sort) return [{ data: 'asc' }, { id: 'asc' }];
    const direction = sort.direction;
    if (sort.key === 'cliente') return [{ clientes: { nome: direction } }, { id: 'asc' }];
    if (sort.key === 'endereco') return [{ enderecos: { rua: direction } }, { enderecos: { numero: direction } }, { id: 'asc' }];
    return [{ [sort.key]: direction }, { id: 'asc' }];
}

export function agendaStatusWhere(status: string, now: Date): Prisma.agendasWhereInput {
    const until = new Date(now.getTime() + AGENDA_WARNING_MS);
    const complete = { entregue: true, concluida: true };
    const overdue = { OR: [
        { entregue: false, data: { lt: now } },
        { concluida: false, dataColeta: { lt: now } },
    ] };
    if (status === 'success') return complete;
    if (status === 'danger') return overdue;
    if (status === 'warning') return { AND: [
        { NOT: overdue },
        { OR: [
            { entregue: false, data: { gte: now, lte: until } },
            { concluida: false, dataColeta: { gte: now, lte: until } },
        ] },
    ] };
    return { AND: [
        { NOT: complete },
        { OR: [{ entregue: true }, { data: { gt: until } }] },
        { OR: [{ concluida: true }, { dataColeta: { gt: until } }] },
    ] };
}

export function agendaWhere(input: z.infer<typeof agendaFiltersSchema>, now = new Date()): Prisma.agendasWhereInput {
    const columns = input.colunas ?? {};
    const conditions: Prisma.agendasWhereInput[] = [];
    const contains = (value: string) => ({ contains: value, mode: 'insensitive' as const });
    if (columns.cliente) conditions.push({ clientes: { nome: contains(columns.cliente) } });
    if (columns.itens) conditions.push({ itens: { some: { estoques: { nome: contains(columns.itens) } } } });
    if (columns.endereco) conditions.push({ enderecos: { OR:
        ['rua', 'numero', 'complemento', 'bairro', 'cep'].map((field) => ({ [field]: contains(columns.endereco!) })),
    } });
    if (columns.observacao) conditions.push({ observacao: contains(columns.observacao) });
    if (columns.valorTotal !== undefined) conditions.push({ valorTotal: Number(columns.valorTotal) });
    if (columns.entregue !== undefined) conditions.push({ entregue: columns.entregue === 'true' });
    if (columns.concluida !== undefined) conditions.push({ concluida: columns.concluida === 'true' });
    for (const field of ['data', 'dataColeta'] as const) {
        if (!columns[field]) continue;
        const date = dayjs.tz(columns[field], Intl.DateTimeFormat().resolvedOptions().timeZone);
        conditions.push({ [field]: { gte: date.startOf('day').toDate(), lte: date.endOf('day').toDate() } });
    }
    if (columns.status) conditions.push(agendaStatusWhere(columns.status, now));
    return {
        ...(input.concluida
            ? { concluida: true, entregue: true }
            : { OR: [{ concluida: false }, { entregue: false }] }),
        ...(input.clienteId ? { clienteId: input.clienteId } : {}),
        ...(input.itemId ? { itens: { some: { itemId: input.itemId } } } : {}),
        ...(input.inicio || input.fim ? {
            data: {
                ...(input.inicio ? { gte: input.inicio } : {}),
                ...(input.fim ? { lte: input.fim } : {}),
            },
        } : {}),
        ...(conditions.length ? { AND: conditions } : {}),
    };
}
