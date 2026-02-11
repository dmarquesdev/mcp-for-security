# --- Stage 1: Build mcp-shared ---
FROM node:22-slim AS shared-builder
WORKDIR /build/mcp-shared
COPY tsconfig.base.json /tsconfig.base.json
COPY packages/mcp-shared/package*.json ./
COPY packages/mcp-shared/tsconfig.json ./
COPY packages/mcp-shared/src/ src/
RUN npm config set fetch-retries 5 && npm config set fetch-retry-maxtimeout 120000 && \
    for i in 1 2 3 4 5; do npm install && break || sleep 15; done && npm run build

# --- Stage 2: Build server TypeScript ---
FROM node:22-slim AS server-builder
ARG SERVER_DIR
WORKDIR /build/server
COPY tsconfig.base.json /tsconfig.base.json
COPY --from=shared-builder /build/mcp-shared /build/mcp-shared
COPY ${SERVER_DIR}/package*.json ./
RUN npm config set fetch-retries 5 && npm config set fetch-retry-maxtimeout 120000 && \
    for i in 1 2 3 4 5; do npm install && break || sleep 15; done && \
    rm -rf node_modules/mcp-shared && cp -r /build/mcp-shared node_modules/mcp-shared
COPY ${SERVER_DIR}/tsconfig.json ./
COPY ${SERVER_DIR}/src/ src/
RUN npm run build

# --- Stage 3: Runtime ---
FROM node:22-slim
ARG GEM_PACKAGE
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ruby-full build-essential \
    && gem install ${GEM_PACKAGE} --no-document \
    && apt-get purge -y build-essential && apt-get autoremove -y \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
COPY --from=server-builder /build/server/build ./build
COPY --from=server-builder /build/server/node_modules ./node_modules
COPY --from=server-builder /build/server/package.json ./
EXPOSE 3000
ENTRYPOINT ["node", "build/index.js"]
