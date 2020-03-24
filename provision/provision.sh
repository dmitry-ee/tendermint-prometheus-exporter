#!/bin/bash

MINTER_DIR="/minter"
MINTER_VERSION="latest"

mkdir -p $MINTER_DIR/config
chown -R 999:1000 $MINTER_DIR

if [ -f "$MINTER_DIR/config/config.toml" ]; then
  # generate config
  docker run --name minter-config-gen --rm -v $MINTER_DIR:/minter dmi7ry/minter-node:$MINTER_VERSION
fi

if [ -f "$MINTER_DIR/config/genesis.json" ]; then
  # download genesis file
  docker run --name minter-genesis-fetch --rm -v $MINTER_DIR:/minter dmi7ry/minter-node:$MINTER_VERSION fetch-genesis
fi

docker-compose up -d
