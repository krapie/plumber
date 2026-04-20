# Stage 1: Build frontend
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Run server
FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY server/ ./server/
COPY package*.json ./
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["node", "server/index.js"]
