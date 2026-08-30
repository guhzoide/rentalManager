# Container e entrega contínua

## Imagem de produção

O `Dockerfile` gera uma imagem que entrega a SPA Vite e a API Hono no mesmo processo Bun, na porta `3001`. O servidor entrega os assets de `dist/` e usa `index.html` como fallback para as rotas da SPA.

É necessário fornecer, no ambiente do container, `DATABASE_URL`, `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL`.

Exemplo local:

```bash
docker build -t rental-manager:local .
docker run --rm -p 3001:3001 \
  -e DATABASE_URL='…' \
  -e BETTER_AUTH_SECRET='…' \
  -e BETTER_AUTH_URL='http://localhost:3001' \
  rental-manager:local
```

## GitHub Actions

O workflow `.github/workflows/docker.yml` é a única pipeline de entrega do projeto. Ele só é executado quando uma tag é enviada ao repositório; pushes em branches, pull requests e execuções manuais não iniciam builds. A publicação usa o `GITHUB_TOKEN` com permissão `packages: write` para enviar imagens ao GitHub Container Registry (GHCR).

Fluxo da pipeline:

```text
git push origin <tag>
  → GitHub Actions
  → Buildx + QEMU
  → build da aplicação e Prisma
  → imagens linux/amd64 e linux/arm64
  → GHCR
```

Cada publicação produz imagens independentes:

- `ghcr.io/<owner>/<repo>:amd64-latest`
- `ghcr.io/<owner>/<repo>:arm64-latest`

Também são criadas tags imutáveis no formato `<arquitetura>-<commit-sha>`. Para baixar uma imagem privada no servidor de destino, autentique o Docker no GHCR com um token que tenha `read:packages`.

## Publicar uma versão

Crie e envie uma tag anotada para disparar a pipeline:

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

O nome da imagem é convertido para minúsculas antes da publicação, pois o GHCR exige esse formato. O repositório atual publica em `ghcr.io/guhzoide/rentalmanager`.

## Operação em servidor

Escolha a imagem compatível com a arquitetura do host:

```bash
# Servidor x86_64/AMD64
docker pull ghcr.io/guhzoide/rentalmanager:amd64-latest

# Servidor ARM64, como Raspberry Pi ou Graviton
docker pull ghcr.io/guhzoide/rentalmanager:arm64-latest
```

O container escuta na porta `3001`; use `GET /health` para health checks. A configuração não possui mais dependências, adaptadores ou URLs da Vercel.
