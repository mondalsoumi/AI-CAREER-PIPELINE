

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY prisma ./prisma
RUN npx prisma generate

FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY src ./src
COPY package.json ./

RUN mkdir -p /app/uploads

EXPOSE 8002
CMD ["node", "src/index.js"]