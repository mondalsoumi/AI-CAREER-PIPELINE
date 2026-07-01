FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Build the Vite app — output goes to /app/dist
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# nginx config to handle React Router (all routes → index.html)
RUN echo 'server { \
  listen 80; \
  location / { \
    root /usr/share/nginx/html; \
    index index.html; \
    try_files $uri $uri/ /index.html; \
  } \
}' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
