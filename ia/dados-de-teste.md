# Massa persistente para testes de carga

Execute `bun run seed:load` para inserir a massa `rental-manager-load-v1` no
PostgreSQL configurado em `DATABASE_URL`. Use somente bancos destinados a testes.
`bun run seed:load --dry-run` apresenta os volumes sem conectar ou escrever.

Volumes: 5.000 clientes, 5.000 endereços, 1.000 produtos, 50.000 locações,
100.000 itens de locação, 100 usuários, 12.000 saídas financeiras, um grupo e uma categoria.
Os nomes, produtos, endereços e observações usam textos naturais, sem marcadores
visuais de carga. Os e-mails usam `example.invalid` e os IDs são UUIDs
determinísticos. A categoria identifica a carga: uma segunda execução
não insere nem altera registros. Todos os inserts ocorrem na mesma transação,
em lotes de 500 locações. Não há limpeza automática.

As locações usam datas entre outubro de 2025 e outubro de 2027, com pendentes e
concluídas, quantidades e valores variados. A disponibilidade dos produtos
considera todas as reservas pendentes. Os produtos ficam ocultos no catálogo;
podem ser habilitados no formulário de estoque para testar a vitrine. Os dados
não são vinculados a clientes ou produtos preexistentes.

Os usuários `carga1@example.invalid` até `carga100@example.invalid` têm senha
padrão `TesteCarga@2026`. Antes da primeira execução, é possível definir
`SEED_TEST_PASSWORD` para substituir a senha padrão. A senha é armazenada com o
hash compatível com Better Auth. Todos são usuários comuns, sem master, sem
WhatsApp e sem atendimento público. O grupo de teste recebe os módulos ativos
no momento da carga. Usuários existentes não são alterados.

A massa afeta os totais reais do sistema de teste, inclusive o financeiro de
locações concluídas. Aplique os índices da migration
`20261027000100_agenda_filters` por `/deploy` antes de comparar desempenho.
A carga adiciona volume para testar paginação, filtros e navegação; ela não
simula usuários simultâneos nem mede capacidade de requisições concorrentes.

Validação do gerador: `bun test scripts/test-data.test.ts`.

Depois da carga, `bun run seed:verify` confere os volumes, as reservas de estoque,
o hash da senha de teste e os principais índices disponíveis no banco.

Para atualizar a apresentação de uma carga já existente, execute
`bun run seed:refresh` (ou `--dry-run` para visualizar exemplos sem escrever).
Esse comando modifica somente nomes, contatos, e-mails de clientes, endereços e
observações dos IDs gerados pela carga. Mantém IDs, relacionamentos, valores,
status, estoque e credenciais de login. Também insere as 12.000 saídas por IDs
estáveis, sem duplicação em reexecuções. Não exclui registros.

As despesas têm tipo `GASTO` e valores positivos, com 480 lançamentos por mês de
outubro de 2025 a outubro de 2027: aluguel, energia, combustível, manutenção,
higienização, equipe, peças, escritório, telefone, divulgação, seguro e
contabilidade. Portanto há saídas também no período atual do financeiro.

A ampliação mantém os primeiros 600 lançamentos e acrescenta outros 11.400,
totalizando 12.000 despesas (20 vezes o volume inicial). Para aplicar somente
as despesas, use `bun run seed:expenses`; o comando ignora IDs existentes e
confere quantidade e soma após inserir. `bun run seed:expenses --dry-run`
mostra os totais esperados sem conectar ao banco. Valores e descrições variam
entre unidades e operações. Não altera despesas que já existem.
