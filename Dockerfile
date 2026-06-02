# ==============================================================================
# STAGE 1: Base & Dependencies
# ==============================================================================
FROM node:20-alpine AS base
WORKDIR /app

# Root package JSON dosyalarını kopyala
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Tüm bağımlılıkları yükle (monorepo workspaces dahil)
RUN npm ci

# ==============================================================================
# STAGE 2: Build Shared Package
# ==============================================================================
FROM base AS build-shared
WORKDIR /app
COPY shared/ ./shared/
RUN npm run build -w shared

# ==============================================================================
# STAGE 3: Build Frontend (React)
# ==============================================================================
FROM build-shared AS build-frontend
WORKDIR /app
COPY frontend/ ./frontend/
RUN npm run build -w frontend

# ==============================================================================
# STAGE 4: Build Backend (NestJS)
# ==============================================================================
FROM build-shared AS build-backend
WORKDIR /app
COPY backend/ ./backend/
COPY prisma/ ./prisma/

# Prisma Client'ı oluştur
RUN npx prisma generate

# Backend'i derle
RUN npm run build -w backend

# Sadece üretim bağımlılıklarını tutmak için temizlik yapacağız
RUN rm -rf node_modules && npm ci --omit=dev && npx prisma generate

# ==============================================================================
# STAGE 5: Production Runner
# ==============================================================================
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Gerekli dosyaları kopyala
COPY --from=build-backend /app/package*.json ./
COPY --from=build-backend /app/node_modules ./node_modules
COPY --from=build-backend /app/shared/package*.json ./shared/
COPY --from=build-backend /app/shared/dist ./shared/dist
COPY --from=build-backend /app/backend/package*.json ./backend/
COPY --from=build-backend /app/backend/dist ./backend/dist
COPY --from=build-backend /app/prisma ./prisma

# Derlenen React frontend'i NestJS'in public statik klasörüne kopyala
COPY --from=build-frontend /app/frontend/dist ./backend/public

EXPOSE 3000

# SQLite veritabanı dosyasının kalıcı olması için boş dosya oluştur
RUN mkdir -p /app/backend/db && touch /app/backend/db/dev.db

CMD ["node", "backend/dist/main.js"]
