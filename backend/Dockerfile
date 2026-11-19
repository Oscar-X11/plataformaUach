FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
RUN npm ci --workspace=backend --include-workspace-root

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY backend ./backend
RUN npx --workspace=backend prisma generate \
 && npm --workspace=backend run build

FROM node:22-alpine AS production
WORKDIR /app/backend
ENV NODE_ENV=production
# Se conserva node_modules completo para poder ejecutar "prisma migrate deploy" en el contenedor.
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/package.json ./package.json
COPY --from=build /app/backend/prisma ./prisma
USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]
