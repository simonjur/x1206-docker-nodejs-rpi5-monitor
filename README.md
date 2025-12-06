# X1206-docker-nodejs-rpi5-monitor

local build:
```bash
docker buildx build -t x1206 .
```

local docker run:
```bash
docker run --rm  --privileged   --device /dev/i2c-1:/dev/i2c-1   --device /dev/gpiochip0:/dev/gpiochip0   -v /var/run:/var/run  docker.io/library/x1206
```

web:
https://suptronics.com/Raspberrypi/Power_mgmt/x1206-v1.1.html

TODO:
- tidy up
- prometheus exporter
- grafana dashboard
  - voltage
  - capacity
  - ac power state
- linter/prettier