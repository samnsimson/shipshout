FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN bunx nx build worker

FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=build /app/apps/worker/dist ./
ENV NODE_ENV=production
CMD ["bun", "main.js"]
