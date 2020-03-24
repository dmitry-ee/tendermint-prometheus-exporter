#!/bin/bash

MINTER_DATA_DIR="/minter"
MINTER_NODE_VERSION="latest"

mkdir -p $MINTER_DIR/config
chown -R 999:1000 $MINTER_DIR

if [ -f "$MINTER_DIR/config/config.toml" ]; then
  # generate config
  echo "$MINTER_DIR/config/config.toml does not exists!"
  docker run --name minter-config-gen --rm -v $MINTER_DIR:/minter dmi7ry/minter-node:$MINTER_VERSION
fi

if [ -f "$MINTER_DIR/config/genesis.json" ]; then
  # download genesis file
  echo "$MINTER_DIR/config/genesis.json does not exists, going to download!"
  docker run --name minter-genesis-fetch --rm -v $MINTER_DIR:/minter dmi7ry/minter-node:$MINTER_VERSION fetch-genesis
fi

docker-compose up -d
