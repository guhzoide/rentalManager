# Domínio, dados e API

## Modelos Prisma

| Modelo | Finalidade | Relações e campos relevantes |
| --- | --- | --- |
| `empresas` | Dados da locadora | nome, logo, CNPJ e telefone; não possui vínculo de tenant com os demais modelos |
| `clientes` | Clientes | possui `enderecos` e `agendas` |
| `enderecos` | Endereços de cliente | pertence a `clientes`; pode ser `principal` |
| `estoques` | Itens locáveis | quantidade total, disponibilidade, diária, imagem de capa (`imageUrl`), galeria (`imageUrls`) e ativo; aparece em `agenda_itens` |
| `agendas` | Agendamentos de locação | cliente, endereço, entrega (`data`), coleta, desconto, total, itens e confirmações `entregue` e `concluida` (coleta) |
| `agenda_itens` | Itens de uma agenda | junta agenda e estoque, com quantidade |
| `transacoes` | Fluxo financeiro manual | descrição, valor, `LUCRO`/`GASTO` e data |
| `modulos` | Catálogo de telas controladas por acesso | identificador estável, nome, descrição, ícone, ordem e status ativo |
| `grupos` | Grupos de acesso | código sequencial, nome, descrição e IDs dos módulos liberados |
| `documentos` | Documentos persistidos do Kanvas | conteúdo visual e vínculo opcional com o usuário proprietário |
| `User`, `Session`, `Account`, `Verification` | Better Auth | tabelas/coleções usadas pela autenticação |

Os IDs são strings UUID persistidas como `citext` no PostgreSQL. `createdAt` e `updatedAt` são controlados pelos modelos; várias mutations também definem `updatedAt` explicitamente.

## Regras de negócio essenciais

### Agenda e estoque

Ao criar uma agenda aberta, cada quantidade de `agenda_itens` é subtraída de `estoques.disponivel`; a reserva falha se não houver saldo. Ao confirmar a coleta (`concluida`), as quantidades são devolvidas. Desmarcar a coleta faz a reserva novamente, sujeita à disponibilidade. A entrega (`entregue`) não altera o estoque. As duas confirmações são independentes; o nome persistido `concluida` é mantido por compatibilidade. Atualizações e exclusões bloqueiam a locação durante a transação para evitar dupla liberação concorrente. Alterar itens ou excluir uma agenda também reconcilia o estoque corretamente. Tudo ocorre em transação Prisma.

A tela de agenda lista por padrão todas as locações em que entrega ou coleta ainda não foram confirmadas,
independentemente do mês, em páginas de 25 registros (com opções de 50 e 100), ordenados pela data de
entrega. O filtro de calendário restringe as pendências ao dia escolhido; limpar
o filtro volta a todas as pendências. As marcações de entrega no calendário são
consultadas separadamente por `agendas.pendingDeliveryDates`, com permissão de
agenda, sem depender da página atual da listagem.

### Clientes e endereços

O cadastro/edição de cliente aceita campos de endereço por conveniência e tenta sincronizá-los na coleção `enderecos`. O endereço principal é definido por `principal`; a API também contém buscas históricas por `complemento === 'Principal'`. Essa inconsistência deve ser considerada antes de refatorar o fluxo.

Excluir um cliente remove seus endereços por cascade no schema. Agendas referenciam cliente/endereço, mas não há cascade definido nelas: avalie referências existentes antes de remover clientes/endereços.

### Financeiro

O painel combina transações manuais e agendas concluídas do período. Uma agenda só entra no financeiro depois que `entregue` e `concluida` (coleta) forem ambas marcadas como `true`; enquanto estiver aberta, seu valor não compõe o histórico, as entradas, o saldo, o fluxo diário nem as estatísticas financeiras de clientes. Ao concluir, a agenda com `valorTotal > 0` entra visualmente como `LUCRO` e permanece contabilizada. Se a agenda for excluída, sua entrada também desaparece do financeiro.

As receitas automáticas de locação são derivadas diretamente das agendas e **não** criam registros em `transacoes`. Por isso, não podem ser excluídas isoladamente pela tela financeira. A coleta deve alterar somente o status e liberar o estoque, preservando o valor da locação; a exclusão de uma agenda aberta libera o estoque, enquanto excluir uma agenda já concluída não pode liberá-lo novamente.

### Grupos e controle de acesso

Cada usuário pode possuir um `grupoCodigo` e o indicador booleano `master`. A sessão retornada pelo Better Auth inclui esses campos, `allowedPages` com os IDs liberados e `allowedModules` com os metadados de navegação carregados da coleção `modulos`. Menu, sidebar, navegação interna e procedures protegidas devem respeitar esses dados.

Usuários comuns recebem exclusivamente os módulos ativos liberados pelo grupo. Um usuário comum sem grupo não possui acesso a módulos. Usuários `master` ignoram as permissões de grupo e recebem todos os módulos ativos, podendo executar todas as operações protegidas por módulo. O campo `master` é configurado na tela de usuários por um switch próprio.

A coleção `modulos` é a única fonte de dados para o catálogo de páginas. Identificador, nome, descrição, ícone, ordem e status não devem ser mantidos em arrays hardcoded no frontend ou no backend. Ao adicionar uma página, persista primeiro seu módulo no banco; a sessão e a navegação devem carregar os metadados dessa coleção. O código mantém apenas o vínculo técnico inevitável entre o identificador persistido e o componente React responsável por renderizar a página.

`grupos.codigo` usa uma sequência `autoincrement()` nativa do PostgreSQL. O código é imutável. Um grupo com usuários vinculados não pode ser excluído.

### Catálogo público

O catálogo em `/` consulta `estoque.list` e `usuarios.listAtendentes` sem autenticação. Para usuário não autenticado, `estoque.list` força o filtro `ativo: true`. O catálogo usa tema claro, busca e ordenação no servidor, com páginas de 12 itens. Apresenta disponibilidade e cria links para WhatsApp de usuários marcados como atendentes com telefone preenchido.

### Kanvas e propriedade de documentos

O editor persiste documentos em `documentos`. Todo novo documento recebe `usuarioId` a partir da sessão autenticada; esse proprietário não pode ser escolhido pelo cliente. Usuários comuns só podem listar, abrir, alterar, excluir e emitir nota de documentos próprios. Essa regra é aplicada em todas as procedures do router, impedindo acesso direto por ID a documentos de terceiros. Usuários `master` podem listar e operar todos os documentos, inclusive registros legados sem proprietário.

Os elementos podem ser texto, grid, separador ou grupo de campos e podem vincular dados de `estoque`, `clientes`, `agendas`, `transacoes` e `empresa`. A saída “Gerar PDF” chama a impressão do navegador (`window.print`).

## Procedures tRPC

| Router | Públicas | Protegidas |
| --- | --- | --- |
| `clientes` | — | `list`, `create`, `update`, `delete` |
| `enderecos` | — | `list`, `byClienteId`, `create`, `update`, `delete` |
| `estoque` | `list` | `create`, `update`, `delete` |
| `agendas` | — | `list`, `create`, `update`, `delete` |
| `transacoes` | — | `list`, `create`, `delete` |
| `usuarios` | `listAtendentes` | `list`, `create`, `update`, `delete` |
| `grupos` | — | `modules`, `list`, `create`, `update`, `delete` |
| `empresa` | — | `list`, `update` |
| `documentos` | — | `list`, `get`, `create`, `update`, `delete`, `emitirNf` |

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

- Usuário: nome mínimo 3, e-mail válido, senha mínima 6, flags `atendente` e `master`, WhatsApp e grupo opcionais.
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

A identidade pública do catálogo usa `empresa.catalog`, que retorna somente nome, logo base64, slogan e `sobreNos`. O texto Sobre nós é editável em Empresa e armazenado como texto simples. A migration `20260912000200_company_catalog` adiciona os campos necessários pela página de deploy.

### Filtros e paginação da agenda

A tabela usa `agendas.search`, com filtros tipados de cliente, item, conclusão e
intervalo de entrega. O servidor aplica os filtros antes de contar e paginar,
com limite máximo de 100 e páginas de 25, 50 ou 100 na interface. A ordenação é por entrega
e ID. As relações retornam apenas os campos necessários, sem imagens de estoque.
`agendas.filterOptions` pesquisa clientes e itens com lotes de 30 (máximo 50),
carregamento incremental e debounce de 300 ms. Concluídas e pendentes são
exclusivas no switch, e mudar qualquer filtro retorna à primeira página.
Os índices estão na migration `20261027000100_agenda_filters`, com criação
transacional e limites de espera e execução. A paginação usa offset; páginas
muito profundas e contagens exatas ainda podem custar mais em bases grandes.

### Indicadores e gráficos financeiros

A aba Estatísticas & Gráficos usa `transacoes.analytics({ mes, ano })`, com
permissão de financeiro. O backend agrega todos os registros do mês, sem o
limite de 1.000 das listagens, com limites de data no fuso America/Sao_Paulo.
Entradas incluem lançamentos LUCRO e locações com entrega e coleta confirmadas pela data de entrega;
locações pendentes não compõem receitas, ticket ou rankings. O cálculo mantém
compatibilidade com totais zerados de locações antigas. Os cards do fluxo de
caixa usam o mesmo resumo para apresentar valores consistentes entre abas.

A evolução pode ser diária ou acumulada. Os rankings de itens e clientes usam
somente o mês selecionado. A distribuição de despesas agrupa pela descrição
anterior a ` — `, mostra os cinco maiores grupos e reúne o restante em Outros,
preservando o total e 100% da distribuição. Esses grupos são derivados das
descrições, pois o modelo de transações não tem uma categoria dedicada.

A aba de gráficos não consulta listas globais nem carrega imagens de produtos.
Estados de carregamento, erro e mês sem atividade têm apresentação própria.
A consulta é somente leitura e não exige migração.

Teste de integração isolado em tabelas temporárias:
`RUN_FINANCE_DB_TESTS=1 bun test src/server/utils/financeAnalytics.test.ts`.

### Apresentação do catálogo

O catálogo público usa uma paleta clara com acentos de coral e lilás, com a
identidade da empresa, fotos de produtos, disponibilidade, dimensões e diária.
O filtro Todos os produtos é explícito e não depende da existência da categoria
Sem categoria. Busca e filtros flutuantes permanecem acessíveis durante a rolagem;
opções de busca, categoria, ordenação e paginação continuam no servidor.

Os detalhes e a apresentação da empresa usam diálogos nativos com foco contido,
fechamento por Escape e retorno de foco ao controle de origem. O detalhe do
produto permite contato com cada atendente por WhatsApp mencionando o item.
Somente números brasileiros válidos em formato local ou com DDI 55 geram links.
Não há envio automático de mensagens. Estados de carregamento, erro e catálogo
vazio aparecem na própria página. A modernização não altera a regra de exibição:
somente produtos ativos e com exibirCatalogo habilitado são consultados.

O catálogo de brinquedos usa uma apresentação voltada a festas, com acentos
coral/lilás e carrossel com fotos dos brinquedos disponíveis entre os resultados
atuais no hero. Cada foto abre os detalhes do próprio item; na ausência de foto, usa uma
ilustração vetorial decorativa, sem inventar produtos ou disponibilidade.
A marca e o slogan cadastrados são preservados. O guia de locação orienta a
escolha, a conferência das medidas e a consulta da data por contato com a equipe;
o site não confirma uma reserva nem promete serviços adicionais.

O carrossel fica restrito à região visual do hero, preservando a chamada à
esquerda. Usa capa e galeria válidas dos itens ativos, visíveis e disponíveis,
sem repetir a mesma foto por produto, com até 12 imagens e prioridade para
mostrar brinquedos diferentes. Tem setas, indicadores, gestos no celular e
rotação a cada 5 segundos com pausa manual. A rotação pausa durante interação,
com a página oculta, fora da área visível ou com um diálogo aberto. A preferência
por movimento reduzido desativa a reprodução automática inicial. Abrir uma foto
mostra a mesma imagem no diálogo do brinquedo correspondente.

### Entrega, coleta e alertas da agenda

A migration `20261029000000_agenda_delivery` adiciona `entregue` e preserva as
locações anteriormente concluídas com ambas as confirmações verdadeiras. O
switch Coletada substitui Concluída na tabela e usa a coluna legada `concluida`.
O filtro Concluídas exige ambas; Pendentes inclui qualquer confirmação ausente.
Histórico, totais e gráficos financeiros também exigem ambas, inclusive no SQL
de agregação. Desmarcar qualquer uma remove a receita automática derivada.

Os alertas são calculados no servidor por `agendaStatus`, usando `Date.now()`:
vermelho para entrega ou coleta não confirmada com horário vencido, amarelo
quando falta até uma hora e verde somente com ambas confirmadas. Etapas já
confirmadas não geram atraso. A listagem atualiza a cada 30 segundos enquanto
a página está visível e usa o fuso IANA informado pelo servidor para exibir
os horários. O fuso vem da configuração local/TZ do processo servidor; o
relógio do navegador não define as cores. A tag da coluna Situação mantém a cor e o texto do alerta. No desktop,
somente a tag recebe a cor; a linha mantém fundo e bordas padrão.
No mobile, o card inteiro recebe fundo suave e borda na cor da situação.


### Colunas da agenda

A grid exibe endereço de entrega (rua, número, complemento, bairro e CEP),
entrega e coleta em colunas separadas. `agendas.search` aceita `colunas` com
filtros de nome de item, cliente, endereço, observação, valor exato, dia de
entrega/coleta, confirmações e situação. Datas de coluna usam o dia no fuso local
do servidor; situação usa o mesmo instante do servidor aplicado às cores das
tags de situação. Os filtros combinam com os combos e o calendário antes de contar e paginar.

`sort` aceita cliente, endereço, entrega, coleta, valor, observação e confirmações,
com `direction: asc/desc`. Campos e direções desconhecidos são rejeitados.
Cliente/endereço usam ordenação pelas relações, sempre com ID para desempate.
Itens e situação têm filtros, sem ordenação artificial de campos compostos.
A mudança é somente de consultas e interface, sem nova migração.

### Busca em grids e seletores

Clientes, estoque, usuários e grupos enviam a pesquisa geral pelo `useGridColumns`
para o backend, junto aos filtros de coluna. A busca geral combina os campos
pesquisáveis com OR e os filtros específicos com AND; contagem e paginação usam
as mesmas condições. A grid com paginação remota não filtra novamente a página
recebida. Usuários mapeiam `nome` para `name`; categoria usa `categoria.nome`.
As consultas de texto não diferenciam maiúsculas e minúsculas.

`seletores` fornece clientes, itens, categorias, grupos, endereços, agendas,
transações e empresas para o `RemoteAutocomplete`. Os endpoints exigem permissão
nos módulos consumidores. Busca com debounce de 300 ms, termo de até 100 caracteres,
lotes padrão de 30 (máximo 50), projeções leves e cursor pelo ID com ordenação
estável. Não há contagem total para abrir um combo. O próximo lote é carregado ao
rolar a lista. IDs selecionados são resolvidos diretamente, mesmo fora do lote
atual; endereços sempre exigem e respeitam o cliente selecionado. Mutações dos
cadastros invalidam o cache dos seletores. Os itens selecionados no formulário
alimentam o cálculo de preço e disponibilidade sem pré-carregar todo o estoque.

No Kanvas, as seleções de registro e de locação para nota fiscal também são
pesquisáveis. `seletores.records`, exclusivo do módulo canvas, carrega os registros
explicitamente escolhidos e seus vínculos para a visualização do documento.
Documentos existentes resolvem seus IDs ao abrir. Os snapshots limitados usados
para metadados e grids sem seleção explícita não limitam os resultados dos combos.
