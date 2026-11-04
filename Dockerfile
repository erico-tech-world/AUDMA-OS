FROM oven/bun:1.4.2-alpine AS build

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run lint && bun run build

FROM oven/bun:1.4.2-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production && bun pm cache rm
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["bun", "dist/server.cjs"]