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
RUN node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8'));delete(p.dependencies||{})['mcp-shared'];delete(p.devDependencies||{})['test-helpers'];require('fs').writeFileSync('package.json',JSON.stringify(p,null,2))" && \
    npm config set fetch-retries 5 && npm config set fetch-retry-maxtimeout 120000 && \
    for i in 1 2 3 4 5; do npm install && break || sleep 15; done && \
    cp -r /build/mcp-shared node_modules/mcp-shared
COPY ${SERVER_DIR}/tsconfig.json ./
COPY ${SERVER_DIR}/src/ src/
RUN npm run build

# --- Stage 3: Build Go binary ---
FROM golang:1.25-bookworm AS go-builder
ARG GO_PACKAGE
ARG GO_VERSION=latest
RUN for i in 1 2 3 4 5; do go install ${GO_PACKAGE}@${GO_VERSION} && break || sleep 15; done

# --- Stage 4: Runtime ---
FROM node:22-slim
ARG TOOL_BIN
WORKDIR /app
COPY --from=go-builder /go/bin/${TOOL_BIN} /usr/local/bin/${TOOL_BIN}
COPY --from=server-builder /build/server/build ./build
COPY --from=server-builder /build/server/node_modules ./node_modules
COPY --from=server-builder /build/server/package.json ./
EXPOSE 3000
ENTRYPOINT ["node", "build/index.js"]
