# syntax=docker/dockerfile:1.4
# =============================================================================
# KINESTEM Backend - Multi-stage Dockerfile Seguro
# =============================================================================

# -----------------------------------------------------------------------------
# Etapa Base: Node LTS Slim con Corepack y PNPM
# -----------------------------------------------------------------------------
FROM node:lts-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# -----------------------------------------------------------------------------
# Etapa Build: Descarga con caché BuildKit y compilación TypeScript
# -----------------------------------------------------------------------------
FROM base AS builder
WORKDIR /workspace

# Copiar manifiestos de dependencias para optimizar caché de capas Docker
COPY .npmrc package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/backend/package.json ./apps/backend/

# Montar caché BuildKit e instalar dependencias con pnpm fetch / install offline
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm fetch --frozen-lockfile || pnpm install --frozen-lockfile --prefer-offline

# Copiar archivos fuente y configuraciones de compilación
COPY tsconfig.base.json ./
COPY packages/shared-types/ ./packages/shared-types/
COPY apps/backend/ ./apps/backend/

# Compilar tipos compartidos y backend
RUN pnpm --filter @kinestem/shared-types run build || true
RUN pnpm --filter @kinestem/backend run build

# Desplegar únicamente dependencias de producción para el runtime
RUN pnpm --filter @kinestem/backend --prod deploy /prod/backend

# -----------------------------------------------------------------------------
# Etapa Runtime: Imagen mínima sin privilegios (appuser UID 1001)
# -----------------------------------------------------------------------------
FROM node:lts-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Crear usuario y grupo sin privilegios de root (anti-escalada de privilegios)
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -s /bin/sh -m appuser

# Copiar artefactos compilados y dependencias listas para ejecución
COPY --from=builder --chown=appuser:appgroup /workspace/apps/backend/dist ./dist
COPY --from=builder --chown=appuser:appgroup /workspace/apps/backend/database ./database
COPY --from=builder --chown=appuser:appgroup /prod/backend/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /workspace/apps/backend/package.json ./package.json

# Cambiar a usuario no-root
USER appuser:appgroup

EXPOSE 3000

CMD ["node", "dist/server.js"]
