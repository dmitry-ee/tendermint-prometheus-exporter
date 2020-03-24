#!/bin/bash

export MINTER_DATA_DIR="/minter"
export MINTER_NODE_VERSION="latest"

mkdir -p $MINTER_DATA_DIR/config
chown -R 999:1000 $MINTER_DATA_DIR

if [ -f "$MINTER_DATA_DIR/config/config.toml" ]; then
  echo "config.toml exists..."
else
  # generate config
  echo "$MINTER_DATA_DIR/config/config.toml does not exists!"
  docker run --name minter-config-gen --rm -v $MINTER_DATA_DIR:/minter dmi7ry/minter-node:$MINTER_NODE_VERSION
fi

if [ -f "$MINTER_DATA_DIR/config/genesis.json" ]; then
  echo "genesis.json exists..."
else
  # download genesis file
  echo "$MINTER_DATA_DIR/config/genesis.json does not exists, going to download!"
  docker run --name minter-genesis-fetch --rm -v $MINTER_DATA_DIR:/minter dmi7ry/minter-node:$MINTER_NODE_VERSION fetch-genesis
fi

docker-compose up -d --remove-orphans
