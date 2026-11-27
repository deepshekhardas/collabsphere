FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM dependencies AS assets
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV HOST=0.0.0.0
ENV PORT=3000
ENV COLLABSPHERE_DB_PATH=/data/collabsphere.sqlite
RUN mkdir -p /data && chown node:node /data
COPY --from=assets --chown=node:node /app/node_modules ./node_modules
COPY --from=assets --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json server.ts ./
COPY --chown=node:node server ./server
USER node
EXPOSE 3000
CMD ["npm", "start"]
