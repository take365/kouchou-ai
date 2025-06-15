FROM node:22-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_BASEPATH
ARG NEXT_PUBLIC_PUBLIC_API_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG API_BASEPATH
ARG NEXT_PUBLIC_ENVIRONMENT  

ENV NEXT_PUBLIC_API_BASEPATH=${NEXT_PUBLIC_API_BASEPATH}
ENV NEXT_PUBLIC_PUBLIC_API_KEY=${NEXT_PUBLIC_PUBLIC_API_KEY}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV API_BASEPATH=${API_BASEPATH}
ENV NEXT_PUBLIC_ENVIRONMENT=${NEXT_PUBLIC_ENVIRONMENT}
ENV NEXT_DISABLE_FETCH_DURING_BUILD=true

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build



FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
