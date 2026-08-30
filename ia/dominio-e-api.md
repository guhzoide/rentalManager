# Domínio, dados e API

## Modelos Prisma

| Modelo | Finalidade | Relações e campos relevantes |
| --- | --- | --- |
| `empresas` | Dados da locadora | nome, logo, CNPJ e telefone; não possui vínculo de tenant com os demais modelos |
| `clientes` | Clientes | possui `enderecos` e `agendas` |
| `enderecos` | Endereços de cliente | pertence a `clientes`; pode ser `principal` |
| `estoques` | Itens locáveis | quantidade total, disponibilidade, diária, imagem de capa (`imageUrl`), galeria (`imageUrls`) e ativo; aparece em `agenda_itens` |
| `agendas` | Agendamentos de locação | cliente, endereço, entrega (`data`), coleta, desconto, total, itens e status `concluida` |
| `agenda_itens` | Itens de uma agenda | junta agenda e estoque, com quantidade |
| `transacoes` | Fluxo financeiro manual | descrição, valor, `LUCRO`/`GASTO` e data |
| `User`, `Session`, `Account`, `Verification` | Better Auth | tabelas/coleções usadas pela autenticação |

Os IDs são strings UUID mapeadas para `_id` no MongoDB. `createdAt` e `updatedAt` são controlados pelos modelos; várias mutations também definem `updatedAt` explicitamente.

## Regras de negócio essenciais

### Agenda e estoque

Ao criar uma agenda aberta, cada quantidade de `agenda_itens` é subtraída de `estoques.disponivel`; a reserva falha se não houver saldo. Ao marcá-la como concluída, as quantidades são devolvidas. Reabrir uma locação faz a reserva novamente, sujeita à disponibilidade. Alterar itens ou excluir uma agenda também reconcilia o estoque corretamente. Tudo ocorre em transação Prisma.

### Clientes e endereços

O cadastro/edição de cliente aceita campos de endereço por conveniência e tenta sincronizá-los na coleção `enderecos`. O endereço principal é definido por `principal`; a API também contém buscas históricas por `complemento === 'Principal'`. Essa inconsistência deve ser considerada antes de refatorar o fluxo.

Excluir um cliente remove seus endereços por cascade no schema. Agendas referenciam cliente/endereço, mas não há cascade definido nelas: avalie referências existentes antes de remover clientes/endereços.

### Financeiro

O painel combina transações manuais e agendas do período. Toda agenda com `valorTotal > 0` entra visualmente como `LUCRO`; ela **não** cria uma `transacoes` no banco. Esses lançamentos automáticos não podem ser excluídos pela tela financeira.

### Catálogo público

`/catalog` consulta `estoque.list` e `usuarios.listAtendentes` sem autenticação. Para usuário não autenticado, `estoque.list` força o filtro `ativo: true`. O catálogo apresenta disponibilidade e cria links para WhatsApp de usuários marcados como atendentes com telefone preenchido.

### Kanvas

O editor mantém seus documentos apenas no estado React. Não há persistência, upload ou endpoint específico. Os elementos podem ser texto, grid, separador ou grupo de campos e podem vincular dados de `estoque`, `clientes`, `agendas`, `transacoes` e `empresa`. A saída “Gerar PDF” chama a impressão do navegador (`window.print`).

## Procedures tRPC

| Router | Públicas | Protegidas |
| --- | --- | --- |
| `clientes` | — | `list`, `create`, `update`, `delete` |
| `enderecos` | — | `list`, `byClienteId`, `create`, `update`, `delete` |
| `estoque` | `list` | `create`, `update`, `delete` |
| `agendas` | — | `list`, `create`, `update`, `delete` |
| `transacoes` | — | `list`, `create`, `delete` |
| `usuarios` | `listAtendentes` | `list`, `create`, `update`, `delete` |
| `empresa` | — | `list`, `update` |

Listagens paginadas recebem, salvo exceções, o contrato abaixo:

```ts
{
  pagina?: number; // padrão 1
  limit?: number;  // padrão 50, máximo 1000
  filtros?: Record<string, unknown>; // repassado diretamente ao where Prisma
  orderBy?: Record<string, unknown>;
}
```

O resultado é `{ data, total, pagina, limit, totalPaginas }`. Filtros e ordenação são deliberadamente genéricos e chegam ao Prisma; valide cuidadosamente qualquer input novo que os complemente.

## Validações compartilhadas

`src/lib/schemas.ts` é a referência para mutations e formulários:

- Usuário: nome mínimo 3, e-mail válido, senha mínima 6, `atendente` e WhatsApp opcional.
- Cliente: nome mínimo 3 e contato obrigatório; CPF e dados de endereço opcionais.
- Endereço: cliente, CEP com pelo menos 8 caracteres, rua, número e `principal` obrigatórios.
- Estoque: dimensões, peso, valor, quantidade e disponível não negativos; quantidades inteiras.
- Agenda: entrega/coleta, cliente, endereço, ao menos um item com quantidade inteira positiva, desconto de 0–100 e total não negativo.

## Fluxo recomendado para criar um módulo

1. Modele a persistência em `prisma/schema.prisma` e execute a geração Prisma necessária.
2. Defina schema Zod e tipos em `src/lib/schemas.ts` se o módulo tiver entrada de formulário.
3. Crie o router em `src/server/routers/`, protegendo-o por padrão.
4. Registre-o em `src/server/routers/_app.ts`; o tipo do cliente será inferido automaticamente.
5. Implemente página e formulário, usando `trpc.<router>` e invalidando queries afetadas em `onSuccess`.
6. Acrescente navegação em `App.tsx`/`MenuPage.tsx` se a funcionalidade for uma tela principal.
