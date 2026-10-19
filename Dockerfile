# HAHA — lean multi-stage image (app + worker share it).
# Built in CI, never on the 2GB VPS. Pruned.–only runtime deps ship.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim AS build
WORKDIR /app
# Prisma engines are platform-specific: build on the SAME libc as runtime (glibc).
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Debian slim (glibc) — onnxruntime-node needs ld-linux-x86-64.so.2 (musl/alpine fails).
# fonts-dejavu-core + fontconfig: sharp's librsvg renders <text> in share cards.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libstdc++6 fonts-dejavu-core fontconfig \
  && rm -rf /var/lib/apt/lists/*
# Next standalone server (self-contained) + prod modules for the worker BullMQ job.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/worker ./worker
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts
EXPOSE 3000
CMD ["node", "server.js"]
