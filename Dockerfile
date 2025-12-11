FROM node:24-slim AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential \
      g++ \
      gpiod \
      libgpiod-dev \
      libgpiod2 \
      libnode-dev \
      python3 \
      sudo && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev

FROM node:24-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      gpiod \
      libgpiod2 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./
COPY . .

ENTRYPOINT ["node", "bin/exporter.ts"]