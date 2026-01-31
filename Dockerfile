# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src/database ./src/database
COPY --from=builder /app/.sequelizerc ./.sequelizerc
COPY package*.json ./
RUN mkdir -p logs
EXPOSE 3000
CMD ["node", "dist/main.js"]
