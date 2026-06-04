FROM node:20.19.1-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/pocketbase/package.json apps/pocketbase/package.json

RUN npm ci

COPY . .

ENV NODE_ENV=production

RUN npm run build --prefix apps/web

FROM nginx:1.27-alpine

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/apps/web /usr/share/nginx/html

EXPOSE 80
