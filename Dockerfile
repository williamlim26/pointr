FROM oven/bun:1 AS builder
WORKDIR /app
COPY client/package.json ./client/
RUN cd client && bun install
COPY . .
RUN cd client && bun run build

FROM oven/bun:1 AS runtime
WORKDIR /app
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/client/dist ./client/dist
ENV PORT=8080
EXPOSE 8080
CMD ["bun", "run", "server/index.ts"]
