import { z } from 'zod';

// ─── Usuário ──────────────────────────────────────────────────────────────────

export const usuarioCreateSchema = z.object({
    nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    email: z.string().email('E-mail inválido'),
    senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    atendente: z.boolean(),
    whatsapp: z.string().optional().nullable(),
});

export const usuarioUpdateSchema = z.object({
    nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').optional(),
    email: z.string().email('E-mail inválido').optional(),
    senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional(),
    atendente: z.boolean().optional(),
    whatsapp: z.string().optional().nullable(),
});

export type UsuarioCreateInput = z.infer<typeof usuarioCreateSchema>;
export type UsuarioUpdateInput = z.infer<typeof usuarioUpdateSchema>;

// ─── Cliente ──────────────────────────────────────────────────────────────────

export const clienteSchema = z.object({
    nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    cpf: z.string().optional().nullable(),
    email: z.string().email('E-mail inválido'),
    cep: z.string().optional().nullable(),
    bairro: z.string().optional().nullable(),
    rua: z.string().optional().nullable(),
    numero: z.string().optional().nullable(),
    complemento: z.string().optional().nullable(),
    principal: z.boolean().optional().default(true),
    contato: z.string().min(1, 'Contato é obrigatório'),
});

export type ClienteInput = z.input<typeof clienteSchema>;

// ─── Endereço ─────────────────────────────────────────────────────────────────

export const enderecoSchema = z.object({
    clienteId: z.string().min(1, 'Cliente é obrigatório'),
    cep: z.string().min(8, 'CEP inválido'),
    bairro: z.string().optional().nullable(),
    rua: z.string().min(1, 'Rua é obrigatória'),
    numero: z.string().min(1, 'Número é obrigatório'),
    complemento: z.string().optional().nullable(),
    principal: z.boolean(),
});

export type EnderecoInput = z.infer<typeof enderecoSchema>;

// ─── Estoque ──────────────────────────────────────────────────────────────────

export const estoqueSchema = z.object({
    nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    peso: z.number({ error: 'Informe um número válido' }).min(0, 'Peso não pode ser negativo'),
    largura: z.number({ error: 'Informe um número válido' }).min(0, 'Largura não pode ser negativa'),
    altura: z.number({ error: 'Informe um número válido' }).min(0, 'Altura não pode ser negativa'),
    valorDiaria: z.number({ error: 'Informe um número válido' }).min(0, 'Valor não pode ser negativo'),
    quantidade: z.number({ error: 'Informe um número válido' }).int('Deve ser inteiro').min(0, 'Quantidade não pode ser negativa'),
    disponivel: z.number({ error: 'Informe um número válido' }).int('Deve ser inteiro').min(0, 'Quantidade não pode ser negativa'),
    ativo: z.boolean(),
    imageUrl: z.string().url('Informe uma URL de imagem válida').optional().or(z.literal('')),
    imageUrls: z.array(z.string().url('Informe uma URL de imagem válida').or(z.literal(''))).default([]),
});

export type EstoqueInput = z.infer<typeof estoqueSchema>;

// ─── Agenda ───────────────────────────────────────────────────────────────────

export const agendaItemSchema = z.object({
    itemId: z.string().min(1, 'Selecione um item'),
    quantidade: z.number().int().min(1, 'Quantidade mínima é 1'),
});

export const agendaSchema = z.object({
    data: z.coerce.date({ error: 'Data de entrega é obrigatória' }),
    dataColeta: z.coerce.date({ error: 'Data de coleta é obrigatória' }),
    clienteId: z.string().min(1, 'Cliente é obrigatório'),
    enderecoId: z.string().min(1, 'Endereço é obrigatório'),
    observacao: z.string().optional(),
    itens: z.array(agendaItemSchema).min(1, 'Adicione pelo menos um item'),
    desconto: z.number().min(0).max(100).default(0),
    frete: z.number().min(0).default(0),
    valorTotal: z.number().min(0).default(0),
    concluida: z.boolean().default(false),
});

export type AgendaInput = z.infer<typeof agendaSchema>;

// ─── Empresa ──────────────────────────────────────────────────────────────────

export const empresaSchema = z.object({
    nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    logoUrl: z.string().optional().nullable(),
    cnpj: z.string().optional().nullable(),
    telefone: z.string().optional().nullable(),
    logradouro: z.string().optional().nullable(),
    numero: z.string().optional().nullable(),
    cep: z.string().optional().nullable(),
    bairro: z.string().optional().nullable(),
    complemento: z.string().optional().nullable(),
});

export type EmpresaInput = z.infer<typeof empresaSchema>;
