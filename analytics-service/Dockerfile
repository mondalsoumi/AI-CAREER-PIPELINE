FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY prisma ./prisma
RUN npx prisma generate

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
# Copy src and utils — both needed, utils sits outside src/
COPY src ./src
COPY utils ./utils
COPY package.json ./
EXPOSE 8003
CMD ["node", "src/index.js"]
