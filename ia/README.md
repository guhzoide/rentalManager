# Contexto para agentes de IA

Esta pasta é a fonte de contexto operacional do **Rental Manager**. Consulte estes arquivos antes de propor ou implementar mudanças no projeto.

## Leitura recomendada

1. [arquitetura.md](./arquitetura.md): stack, estrutura, execução e fluxo de requisições.
2. [dominio-e-api.md](./dominio-e-api.md): entidades, regras de negócio, contratos tRPC e validações.
3. [guia-de-alteracoes.md](./guia-de-alteracoes.md): convenções, roteiro de implementação, verificação e débitos técnicos observados.
4. [operacao-docker.md](./operacao-docker.md): imagem de produção e pipeline GitHub Actions.
5. [experiencia-mobile.md](./experiencia-mobile.md): diretriz e checklist de interface mobile-first.

## Objetivo do produto

Sistema de gestão de uma locadora. O usuário autenticado administra clientes, endereços, itens de estoque, agendamentos de locação, usuários e movimentações financeiras. O sistema também expõe um catálogo público e possui o **Kanvas**, um editor visual de documentos que pode consumir dados do sistema e imprimir/gerar PDF pelo navegador.

## Princípios para mudanças

- Preserve os nomes de modelos e campos existentes no Prisma, que estão em português e pluralizados.
- Trate `src/lib/schemas.ts` como o contrato de entrada compartilhado entre formulários e API.
- Proteja novos recursos por padrão; só use `publicProcedure` quando a exposição pública for intencional.
- Para qualquer mudança em agenda, considere sempre o impacto em `estoques.disponivel`.
- Priorize mobile: qualquer tela deve funcionar primeiro em larguras de 320–768px, sem depender de hover, com áreas de toque de pelo menos 44px e sem rolagem horizontal acidental. A versão desktop deve continuar completa.
- Não revele nem versione valores de `.env`; documente apenas nomes de variáveis.
- Antes de editar, confira as mudanças locais: este repositório pode conter trabalho não relacionado em andamento.

## Referências canônicas no código

- Dados: `prisma/schema.prisma`
- Servidor e tRPC: `src/server/`
- Contratos Zod: `src/lib/schemas.ts`
- Cliente tRPC e autenticação: `src/lib/`
- Páginas: `src/pages/`
- Componentes reutilizáveis: `src/components/`
- Utilitários e tipos do Kanvas: `src/utils/canvasUtils.ts`
