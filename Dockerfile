FROM node:20-alpine

RUN npm install -g pnpm@11

ARG CACHE_BUST=1

WORKDIR /app

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/

RUN pnpm install --no-frozen-lockfile

RUN pnpm --filter @workspace/api-server build

EXPOSE 8080

CMD ["pnpm", "--filter", "@workspace/api-server", "start"]
