FROM oven/bun:1-alpine AS build

WORKDIR /app

COPY package.json bun.lock patch-es-toolkit.js ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src
COPY --from=build /app/dist ./dist

# Prisma valida/prepara seus engines ao executar migrations. O runtime roda sem
# privilégios, então os artefatos instalados durante o build precisam pertencer
# ao usuário da aplicação.
RUN chown -R bun:bun /app/node_modules /app/prisma

USER bun
EXPOSE 3001

CMD ["bun", "src/server/index.ts"]
