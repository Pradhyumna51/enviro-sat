# ─── Stage 1: Build Frontend Assets ───
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies with cached layer
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build production bundle
COPY . .
RUN npm run build

# ─── Stage 2: Serve with Nginx ───
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx SPA routing config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
