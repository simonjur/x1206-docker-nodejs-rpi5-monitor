FROM node:24-slim

# Install required packages:
#  - i2c-tools, libi2c-dev: I2C support
#  - gpiod, libgpiod-dev: GPIO via libgpiod
#  - sudo: to allow 'sudo shutdown -h now' if desired
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential \
      g++ \
      gpiod \
      libgpiod2 \
      libgpiod-dev \
      libnode-dev \
      python3 \
      sudo && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy your script into the container
COPY . .

# Copy package files if you prefer using package.json, or install globally here.
# For simplicity, we install the dependencies directly:
RUN npm install

# Optional: make sure the script is executable
RUN chmod +x bin/run.ts


# If you rely on 'sudo' inside the script, make sure the user has permissions;
# simplest is to run as root (default in this image) and you could omit 'sudo'
# in the Node script and just call `shutdown -h now`.
#
# ENTRYPOINT runs the monitor script
ENTRYPOINT ["node", "bin/run.ts"]