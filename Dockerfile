FROM oven/bun:1.3.14-slim AS base
WORKDIR /app

FROM base AS dev-deps
WORKDIR /tmp/dev
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --registry=https://registry.npmjs.org

FROM base AS prod-deps
WORKDIR /tmp/prod
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --registry=https://registry.npmjs.org

FROM base AS build
COPY --from=dev-deps /tmp/dev/node_modules ./node_modules
COPY . .
RUN bun run typecheck
RUN bun test
RUN bun run build

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=prod-deps --chown=bun:bun /tmp/prod/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/package.json ./package.json
COPY --from=build --chown=bun:bun /app/fibel.config.ts ./fibel.config.ts
COPY --from=build --chown=bun:bun /app/src ./src
COPY --from=build --chown=bun:bun /app/docs ./docs
COPY --from=build --chown=bun:bun /app/assets ./assets
COPY --from=build --chown=bun:bun /app/.fibel ./.fibel
COPY --from=build --chown=bun:bun /app/dist ./dist

USER bun
EXPOSE 3000
CMD ["bun", "dist/server.ts"]
