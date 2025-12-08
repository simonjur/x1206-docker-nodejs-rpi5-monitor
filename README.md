# X1206-docker-nodejs-rpi5-monitor

Recently I bought [Suptronics X1206 V1.1 UPS board](https://suptronics.com/Raspberrypi/Power_mgmt/x1206-v1.1.html) 
and put together simple Prometheus exporter for it (based on original python scripts) 
so I can monitor it with Grafana.

## Status
[![Checks](https://github.com/simonjur/x1206-docker-nodejs-rpi5-monitor/actions/workflows/ci-checks.yml/badge.svg)](https://github.com/simonjur/x1206-docker-nodejs-rpi5-monitor/actions/workflows/ci-checks.yml)
[![Build image](https://github.com/simonjur/x1206-docker-nodejs-rpi5-monitor/actions/workflows/build-image.yml/badge.svg)](https://github.com/simonjur/x1206-docker-nodejs-rpi5-monitor/actions/workflows/build-image.yml)
![Node.js](https://img.shields.io/badge/node-24.x-brightgreen?logo=node.js&logoColor=white)

| Platform                    | Tested |
|----------------------------|--------|
| Raspberry Pi 5, Debian 12 (bookworm) | ✅      |
| Raspberry Pi 5, Debian 13 (trixie)   | ❓      |

## Building the image
local image build using docker buildx:

```bash
docker buildx build -t x1206 .
```

or with docker compose:
```bash
docker compose build
```

## Running in docker
local docker run:

```bash
docker run --rm  --privileged   --device /dev/i2c-1:/dev/i2c-1   --device /dev/gpiochip0:/dev/gpiochip0   -v /var/run:/var/run  docker.io/library/x1206
```

local docker compose:
```bash
docker compose up -d
```

## Running locally without docker
Install dependencies:

> [!WARNING]
> Package `node-libgpiod` compiles native code and requires 
> some OS packages to be installed first.
> See [Dockerfile](./Dockerfile) for details.

```bash
npm install
```

Simple status check:
```bash
node --run status
```
should print something like:
```bash
┌────────────────┬───────┐
│         Metric │ Value │
├────────────────┼───────┤
│   Capacity (%) │ 96.87 │
│    Voltage (V) │ 4.161 │
│ AC Power State │    On │
│ Battery status │  Full │
└────────────────┴───────┘
```

