# Arquitetura e execução

## Stack

| Camada | Tecnologia | Papel |
| --- | --- | --- |
| Front-end | React 19, TypeScript, Vite | SPA administrativa e catálogo público |
| UI | CSS próprio e Material UI | Componentes, layout e formulários |
| Estado remoto | TanStack React Query via tRPC React | Queries, mutations e invalidação de cache |
| Back-end | Bun, Hono e tRPC 11 | API tipada em `/trpc/*` |
| Autenticação | Better Auth | Sessão por cookie e login e senha |
| Dados | MongoDB, Prisma 6 | Persistência e relações do domínio |
| Validação | Zod | Contratos de formulários e procedures |

## Estrutura principal

```text
src/
├── App.tsx                 # Shell, autenticação e navegação por abas
├── pages/                  # Telas de cada módulo
├── components/
│   ├── forms/              # Formulários React Hook Form + Zod
│   ├── ui/                 # DataGrid, Modal e confirmação
│   └── canvas/             # Editor e renderizadores do Kanvas
├── lib/                    # Cliente tRPC, Better Auth e schemas Zod
├── server/
│   ├── routers/            # Procedures tRPC por domínio
│   ├── auth.ts             # Configuração Better Auth
│   ├── db.ts               # PrismaClient
│   └── index.ts            # App Hono / entradas HTTP
└── utils/                  # Utilitários, incluindo o modelo do Kanvas
prisma/schema.prisma        # Esquema MongoDB/Prisma
```

O alias `@/` aponta para `src/`.

## Como a aplicação funciona

```text
React page/form
   │ trpc.<domínio>.<procedure>
   ▼
Vite proxy (/trpc e /api/auth em desenvolvimento)
   ▼
Hono (`src/server/index.ts`)
   ▼
tRPC router + autenticação (`src/server/trpc.ts`)
   ▼
Prisma Client
   ▼
MongoDB
```

`App.tsx` não usa um roteador dedicado: as telas internas são abertas como abas em estado local. A exceção é `/catalog`, identificada manualmente por `window.location.pathname`; essa página é pública. As páginas pesadas são carregadas com `lazy`/`Suspense`.

## Execução local

Pré-requisitos: Bun, acesso ao MongoDB e um `.env` configurado.

| Comando | Efeito |
| --- | --- |
| `bun install` | Instala dependências |
| `bun run dev` | Sobe Vite na porta 5173 e API Bun/Hono na 3001 |
| `bun run build` | Executa `prisma generate`, TypeScript e build Vite |
| `bun run lint` | Executa ESLint |
| `bun run preview` | Serve o bundle de produção |

Variáveis necessárias, sem registrar valores: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. A URL de banco deve apontar para MongoDB, pois o datasource Prisma é `mongodb`.

## HTTP, sessão e autorização

- Hono responde a health check em `GET /` e monta Better Auth em `/api/auth/*`.
- tRPC é montado em `/trpc/*` e é consumido pelo cliente em `src/lib/trpc.ts`.
- `protectedProcedure` exige uma sessão válida; `publicProcedure` ainda registra duração, mas não exige login.
- A sessão expira em uma hora. Ao criar uma sessão, sessões anteriores do mesmo usuário são removidas.
- Origens confiáveis e CORS são definidos no servidor; ao adicionar um domínio, atualize tanto `src/server/index.ts` quanto `src/server/auth.ts` quando aplicável.

## Implantação

Em produção, a aplicação é distribuída como um container Bun: o servidor Hono entrega a API e os arquivos estáticos gerados em `dist/`, com fallback para a SPA. O workflow do GitHub Actions publica imagens separadas para `linux/amd64` e `linux/arm64` no GHCR. Veja [operacao-docker.md](./operacao-docker.md) para os nomes das tags e as variáveis exigidas em runtime.
