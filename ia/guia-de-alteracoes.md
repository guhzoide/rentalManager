# Guia de manutenção e implementação

## Convenções atuais

- Código e identificadores técnicos misturam português e inglês; siga o padrão do módulo que estiver alterando.
- Modelos Prisma, routers e dados de domínio são pluralizados (`clientes`, `estoque`, `agendas`).
- Formulários usam React Hook Form com `zodResolver`; mantenha validação visual e server-side alinhadas.
- Páginas usam `trpc.useUtils()` e invalidam as queries afetadas após mutations bem-sucedidas.
- Feedback ao usuário é feito com `react-toastify`; exclusões passam normalmente por `ConfirmationModal`.
- Datas são exibidas/manipuladas com `dayjs`; moeda usa `Intl.NumberFormat` com `pt-BR`/BRL.
- Os arquivos CSS estão centralizados em `src/styles/`; componentes do Kanvas usam muitos estilos inline.
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
- Logos e imagens de estoque são selecionados por arquivo e persistidos como data URLs base64 nos campos existentes (`logoUrl`, `imageUrl`, `imageUrls`). São aceitos JPEG, PNG e WebP até 2 MB por imagem e até 8 imagens de galeria. URLs externas não são aceitas nem retornadas pela API. A página `/deploy` aplica as migrations versionadas para converter as colunas existentes de CITEXT para TEXT e excluir referências antigas que não sejam base64 (sem baixar arquivos). O histórico do Prisma impede reaplicações. Não há serviço externo de armazenamento.
- A documentação padrão do `README.md` ainda é a do template Vite. Esta pasta é a referência de contexto do produto até que o README raiz seja atualizado.

## Decisões que exigem confirmação antes de implementar

- Persistir anexos ou imagens do Kanvas: requer definição de armazenamento e permissões.
- Multiempresa: o schema atual não associa dados operacionais a uma empresa.
- Regras de preço (diárias, período, desconto em moeda vs. percentual) e calendário de disponibilidade: a implementação atual não define essas regras por completo.

## Grids e paginação

Listagens principais usam `.grid-page`, com altura disponível e `min-height: 0`.
A grid mantém toolbar e rodapé fora da área rolável; apenas
`.datagrid-table-wrapper` rola, com cabeçalho da tabela fixo. Cards intermediários
(como Agenda e Financeiro) também precisam de altura delimitada e flex column.
As versões mobile mantêm a mesma rolagem com registros em cartões.

O rodapé oferece 25, 50 e 100 registros por página (padrão 25). Para paginação no
servidor, use `useGridPagination`, envie `pagina: page, limit: pageSize` à API e
passe `page`, `pageSize`, `onPageChange` e `onPageSizeChange` ao `DataGrid`.
Alterar o limite volta à página 1. Sem `onPageChange`, a grid filtra e pagina os
dados fornecidos em memória, como no histórico financeiro e nos endereços.
O seletor local não altera limites de carregamento ou os cálculos do financeiro.

As listagens seguem Estoque e Clientes: começam diretamente na toolbar da grid,
sem título repetido da aba, card externo ou margens de página. Agenda mantém
os combos de cliente/item, switch de conclusão e filtro de calendário na mesma
barra. Usuários e Grupos seguem esse padrão de listagem. Financeiro preserva
seus cards e gráficos; o topo reúne abas internas e período, sem repetir o nome
da página. Formulários de criação/edição mantêm seus títulos de ação.

Na Agenda, criação e edição abrem no componente `Modal`, mantendo a grid
montada ao fundo para preservar filtros, página e rolagem ao cancelar ou fechar.
O corpo do formulário rola dentro do modal; as ações ficam no rodapé.

Os combos da edição da Agenda incluem os registros vinculados à locação, mesmo
fora do lote inicial de opções. A consulta da grid fornece nome, diária e saldo
dos itens para preencher imediatamente e calcular o total. Opções consultadas
mais recentemente substituem os dados iniciais por ID, sem duplicatas. Endereços
são carregados por `enderecos.byClienteId`, sem paginação global de endereços.


## Filtros e ordenação por coluna

O `DataGrid` oferece ordenação pelo título da coluna (crescente, decrescente e
padrão), filtros pelo ícone do cabeçalho e o botão Colunas, também disponível no
celular e quando o resultado está vazio. O menu permite limpar uma coluna ou
todos os filtros/ordenação. Tipos: texto contém, número exato, data, booleano e
select. Configure `filterType`, `filterOptions`, `sortable` e `filterable` na
coluna; use `getValue` quando o valor de exibição local vier de uma composição.

Clientes, Estoque, Usuários e Grupos usam `useGridColumns`, que converte somente
as colunas declaradas em filtros Prisma, com debounce de 300 ms, ordenação
estável por ID e retorno à primeira página. `field` mapeia nomes diferentes ou
relações, como `nome -> name` e `categoria -> categoria.nome`. Colunas de ações e
contagens derivadas podem desabilitar controles. Filtros de coluna nas grades
locais, como o financeiro, operam sobre os dados já carregados antes da paginação
e não alteram os indicadores financeiros ou o limite de consulta desse módulo.

Para grids paginadas no backend, passe `columnFilters`, `onColumnFiltersChange`,
`sort` e `onSortChange`. A grid não filtra nem reordena apenas a página recebida;
sem callbacks, esses controles ficam desabilitados em paginação remota.
A Agenda usa os mesmos controles com seu contrato específico e validado.


No mobile (até 768 px), a área de busca/filtros da toolbar do `DataGrid` inicia
recolhida e é expandida pelo botão Filtros. Os controles continuam montados e as
seleções permanecem aplicadas ao recolher. `activeFilterCount` permite indicar
filtros personalizados ativos; a Agenda informa cliente, item e conclusão.
O toggle expõe `aria-expanded`/`aria-controls`. No desktop os filtros ficam
sempre visíveis. Filtros por coluna continuam acessíveis pelo botão Colunas.


A versão mobile da grid mantém filtros e ações em uma barra compacta de ícones,
com rótulos acessíveis, e paginação em uma única linha. A área de conteúdo usa
margens menores e os cartões não encolhem nem truncam campos. `mobileLayout`
permite destacar campos longos como `stacked` (rótulo acima do texto completo)
e parear campos curtos como `half`. Na Agenda, itens/endereço/observações usam a
largura inteira; entrega/coleta e suas confirmações aparecem em pares. A tabela
desktop mantém o layout. Conteúdo extenso continua acessível pela rolagem da lista.


## Visualização em tabela ou cards

`CardGrid` é o componente reutilizável de apresentação dos registros em cards.
Recebe as mesmas colunas, renderizadores, `mobileLayout`, dados, chave, ação de
edição e classe por registro. O `DataGrid` o utiliza no mobile e no modo Cards
do desktop, com uma grade responsiva de múltiplas colunas.

O botão único Tabela/Cards aparece somente acima de 768 px e preserva filtros,
ordenação, página e limite. Alterar a visualização não faz nova consulta ao
backend; os mesmos registros paginados alimentam ambos os modos. No mobile,
os cards continuam automáticos, sem aumentar a barra de ações.

O padrão do desktop é cards. `defaultView="table"` inicia em tabela; `view` e
`onViewChange` permitem controle externo. `allowViewSwitch={false}` esconde o
seletor em grids embutidas. A escolha fica no estado da instância durante a
navegação, sem gravar preferência global. `CardGrid` isolado apresenta os dados
recebidos; toolbar, filtros e paginação são responsabilidade do `DataGrid`.


O ícone do alternador representa a visualização atual; o clique troca o modo e o
ícone. Seu rótulo acessível informa o modo atual e a próxima ação. No desktop,
os cards têm altura uniforme determinada pelo maior conteúdo da página, sem
corte de texto. No tema claro, a área da lista tem fundo levemente acinzentado,
com cards brancos, contornos mais definidos e sombra suave. A tabela também tem
cabeçalho destacado, linhas alternadas e divisórias mais contrastantes.


## Contraste do tema claro

`src/styles/LightTheme.css`, importado após o CSS principal, centraliza os ajustes
com seletores `body.light`. As variáveis claras em `index.css` definem bordas e
cores semânticas mais legíveis. Navegação, menu, campos e modais usam superfícies
brancas sobre fundo suave, contornos definidos e sombras discretas. Campos
inativos preservam leitura com fundo cinza e texto secundário.

O Financeiro tem o escopo `.finance-page`: os resumos e valores do fluxo de caixa
usam variáveis de cor com fallback para o tema existente. Indicadores e gráficos
usam cores semânticas; painéis, tooltips e formulários seguem a mesma hierarquia.
Os ícones do menu usam `--menu-icon-bg`, com fallback para a cor original.
A apresentação pública do catálogo possui suas próprias variáveis de tema.

- Para combos de registros do banco, use `RemoteAutocomplete` e os endpoints de
  `seletores`; não filtre localmente uma primeira página fixa. Preserve a resolução
  do valor selecionado por ID e invalide `utils.seletores` após alterar cadastros.
- Para grids paginadas no servidor, conecte `search/onSearchChange` pelo
  `useGridColumns`. A filtragem deve acontecer antes da contagem e paginação.
- Regressão de busca: `bun test src/server/routers/seletores.test.ts src/lib/gridColumns.test.ts src/components/ui/DataGrid.test.tsx src/components/forms/AgendaForm.test.tsx`.
  `RUN_SEARCH_DB_TESTS=1` inclui consultas somente de leitura à base local, verificando
  o cliente existente Hugo, pesquisa de usuários, cursores e hidratação do Kanvas.
