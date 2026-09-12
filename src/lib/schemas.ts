import { z } from 'zod';
import { imageDataSchema, MAX_GALLERY_IMAGES } from './images.js';

// ─── Usuário ──────────────────────────────────────────────────────────────────

export const usuarioCreateSchema = z.object({
    nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    email: z.string().email('E-mail inválido'),
    senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    atendente: z.boolean(),
    master: z.boolean(),
    whatsapp: z.string().optional().nullable(),
    grupoCodigo: z.number().int().positive().optional().nullable(),
});

export const usuarioUpdateSchema = z.object({
    nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').optional(),
    email: z.string().email('E-mail inválido').optional(),
    senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional(),
    atendente: z.boolean().optional(),
    master: z.boolean().optional(),
    whatsapp: z.string().optional().nullable(),
    grupoCodigo: z.number().int().positive().optional().nullable(),
});

export type UsuarioCreateInput = z.infer<typeof usuarioCreateSchema>;
export type UsuarioUpdateInput = z.infer<typeof usuarioUpdateSchema>;

// ─── Grupo de acesso ─────────────────────────────────────────────────────────

export const grupoSchema = z.object({
    nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    descricao: z.string().optional().nullable(),
    moduloIds: z.array(z.string()).default([]),
});

export type GrupoInput = z.infer<typeof grupoSchema>;

// ─── Cliente ──────────────────────────────────────────────────────────────────

export const clienteSchema = z.object({
    nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    cpf: z.string().optional().nullable(),
    email: z.string().trim().email('E-mail inválido').or(z.literal('')).optional().nullable(),
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

export const categoriaSchema = z.object({
    nome: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(80, 'Nome deve ter no máximo 80 caracteres'),
});

export type CategoriaInput = z.infer<typeof categoriaSchema>;

export const estoqueSchema = z.object({
    nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    categoriaId: z.string().min(1, 'Categoria é obrigatória'),
    peso: z.number({ error: 'Informe um número válido' }).min(0, 'Peso não pode ser negativo'),
    largura: z.number({ error: 'Informe um número válido' }).min(0, 'Largura não pode ser negativa'),
    altura: z.number({ error: 'Informe um número válido' }).min(0, 'Altura não pode ser negativa'),
    valorDiaria: z.number({ error: 'Informe um número válido' }).min(0, 'Valor não pode ser negativo'),
    quantidade: z.number({ error: 'Informe um número válido' }).int('Deve ser inteiro').min(0, 'Quantidade não pode ser negativa'),
    disponivel: z.number({ error: 'Informe um número válido' }).int('Deve ser inteiro').min(0, 'Quantidade não pode ser negativa'),
    ativo: z.boolean(),
    imageUrl: imageDataSchema.optional(),
    imageUrls: z.array(imageDataSchema).max(MAX_GALLERY_IMAGES, 'Adicione no máximo 8 imagens à galeria').default([]),
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

// Updates must not reuse defaults from agendaSchema: omitted fields need to stay
// omitted, especially when changing only the completion status.
export const agendaUpdateSchema = z.object({
    data: z.coerce.date().optional(),
    dataColeta: z.coerce.date().optional(),
    clienteId: z.string().min(1, 'Cliente é obrigatório').optional(),
    enderecoId: z.string().min(1, 'Endereço é obrigatório').optional(),
    observacao: z.string().optional(),
    itens: z.array(agendaItemSchema).min(1, 'Adicione pelo menos um item').optional(),
    desconto: z.number().min(0).max(100).optional(),
    frete: z.number().min(0).optional(),
    valorTotal: z.number().min(0).optional(),
    concluida: z.boolean().optional(),
});

export type AgendaInput = z.infer<typeof agendaSchema>;
export type AgendaUpdateInput = z.infer<typeof agendaUpdateSchema>;

// ─── Empresa ──────────────────────────────────────────────────────────────────

export const empresaSchema = z.object({
    nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    logoUrl: imageDataSchema.optional().nullable(),
    slogan: z.string().optional().nullable(),
    sobreNos: z.string().max(10000, 'Use até 10.000 caracteres').optional().nullable(),
    cnpj: z.string().optional().nullable(),
    telefone: z.string().optional().nullable(),
    logradouro: z.string().optional().nullable(),
    numero: z.string().optional().nullable(),
    cep: z.string().optional().nullable(),
    bairro: z.string().optional().nullable(),
    complemento: z.string().optional().nullable(),
});

export type EmpresaInput = z.infer<typeof empresaSchema>;

// ─── Implantação ─────────────────────────────────────────────────────────────

export const databaseConnectionSchema = z.object({
    host: z.string().trim().min(1, 'Host é obrigatório')
        .refine((value) => !/[\s/@?#]/.test(value), 'Informe somente o host ou endereço IP'),
    port: z.number().int().min(1).max(65535),
    database: z.string().trim().min(1, 'Banco de dados é obrigatório'),
    username: z.string().trim().min(1, 'Usuário é obrigatório'),
    password: z.string().min(1, 'Senha é obrigatória'),
});

export const deployMasterSchema = usuarioCreateSchema.pick({
    nome: true,
    email: true,
    senha: true,
});

export type DatabaseConnectionInput = z.infer<typeof databaseConnectionSchema>;
export type DeployMasterInput = z.infer<typeof deployMasterSchema>;
