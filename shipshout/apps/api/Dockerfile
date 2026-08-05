FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN bunx nx build api

FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=build /app/apps/api/dist ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "main.js"]
