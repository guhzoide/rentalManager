# Guia de manutenção e implementação

## Convenções atuais

- Código e identificadores técnicos misturam português e inglês; siga o padrão do módulo que estiver alterando.
- Modelos Prisma, routers e dados de domínio são pluralizados (`clientes`, `estoque`, `agendas`).
- Formulários usam React Hook Form com `zodResolver`; mantenha validação visual e server-side alinhadas.
- Páginas usam `trpc.useUtils()` e invalidam as queries afetadas após mutations bem-sucedidas.
- Feedback ao usuário é feito com `react-toastify`; exclusões passam normalmente por `ConfirmationModal`.
- Datas são exibidas/manipuladas com `dayjs`; moeda usa `Intl.NumberFormat` com `pt-BR`/BRL.
- CSS global está em `src/App.css` e `src/index.css`; componentes do Kanvas usam muitos estilos inline.
- O catálogo de módulos é persistido em `modulos`; não recrie listas hardcoded de páginas, nomes, ícones ou ordem na aplicação.
- Autorização de documentos do Kanvas deve ser aplicada no servidor por `usuarioId`; esconder registros apenas no frontend não é controle de acesso.
- `master` é o único bypass das permissões de grupo e da propriedade dos documentos.

## Checklist antes de editar

1. Consulte `git status --short` e preserve alterações que não pertencem à solicitação.
2. Localize a tela, o formulário, o schema e o router correspondentes.
3. Identifique consultas dependentes para invalidar cache após a mutation.
4. Se houver alteração de dados, avalie relações, cascades e regras de estoque/financeiro.
5. Não copie segredos de `.env` para código, documentação, testes ou logs.
6. Ao criar uma tela principal, cadastre seu módulo no banco e defina quais grupos terão acesso.

## Checklist de entrega

1. Rode `bun run lint`.
2. Rode `bun run build`, que também executa `prisma generate`.
3. Teste manualmente o fluxo feliz, erro de validação, autenticação e atualização da listagem afetada.
4. Para mudanças de agenda, teste criar, editar itens e excluir, conferindo `disponivel` antes/depois.
5. Para mudanças públicas, teste uma janela anônima e confirme que dados protegidos não vazam.

## Pontos de atenção conhecidos

Estes itens descrevem o estado atual, não mudanças já realizadas:

- `App.tsx` consulta uma empresa por ID fixo. Para multiempresa ou ambiente novo, essa dependência deve ser removida ou configurável.
- Usuários comuns sem grupo não recebem módulos. Garanta que ao menos um usuário esteja marcado como `master` antes de ativar essa política em uma base existente.
- O servidor impede reserva acima da disponibilidade, mas ainda não verifica conflito temporal entre locações nem define regras de disponibilidade por período.
- O cliente mistura `principal` e `complemento === 'Principal'` na sincronização de endereço; padronize antes de depender desse marcador em novos fluxos.
- `transacoes` é independente de `agendas`; o financeiro apenas consolida os dois no front-end.
- Documentos legados do Kanvas sem `usuarioId` ficam acessíveis apenas a usuários `master`; atribua um proprietário por migração caso devam voltar a usuários comuns.
- Imagens de estoque são URLs externas (`imageUrl` como capa e `imageUrls` como galeria); não há upload ou armazenamento de arquivos configurado.
- A documentação padrão do `README.md` ainda é a do template Vite. Esta pasta é a referência de contexto do produto até que o README raiz seja atualizado.

## Decisões que exigem confirmação antes de implementar

- Persistir anexos ou imagens do Kanvas: requer definição de armazenamento e permissões.
- Multiempresa: o schema atual não associa dados operacionais a uma empresa.
- Regras de preço (diárias, período, desconto em moeda vs. percentual) e calendário de disponibilidade: a implementação atual não define essas regras por completo.
