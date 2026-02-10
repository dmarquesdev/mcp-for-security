# --- Stage 1: Build mcp-shared ---
FROM node:22-slim AS shared-builder
WORKDIR /build/mcp-shared
COPY tsconfig.base.json /tsconfig.base.json
COPY packages/mcp-shared/package*.json ./
COPY packages/mcp-shared/tsconfig.json ./
COPY packages/mcp-shared/src/ src/
RUN npm install && npm run build

# --- Stage 2: Build server TypeScript ---
FROM node:22-slim AS server-builder
ARG SERVER_DIR
WORKDIR /build/server
COPY tsconfig.base.json /tsconfig.base.json
COPY --from=shared-builder /build/mcp-shared /build/mcp-shared
COPY ${SERVER_DIR}/package*.json ./
RUN npm install
COPY ${SERVER_DIR}/tsconfig.json ./
COPY ${SERVER_DIR}/src/ src/
RUN npm run build

# --- Stage 3: Build Go binary ---
FROM golang:1.25-bookworm AS go-builder
ARG GO_PACKAGE
ARG GO_VERSION=latest
RUN go install ${GO_PACKAGE}@${GO_VERSION}

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
