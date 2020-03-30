#!/bin/bash

export MINTER_DATA_DIR="/minter"
export MINTER_NODE_VERSION="1.1.5"

mkdir -p $MINTER_DATA_DIR/config
chown -R 999:1000 $MINTER_DATA_DIR

if [ -f "$MINTER_DATA_DIR/config/config.toml" ]; then
  echo "config.toml exists..."
else
  # generate config
  echo "$MINTER_DATA_DIR/config/config.toml does not exists!"
  docker run --name minter-config-gen --rm -v $MINTER_DATA_DIR:/minter dmi7ry/minter-node:$MINTER_NODE_VERSION show_validator
  sed -i 's/prometheus = false/prometheus = true/' $MINTER_DATA_DIR/config/config.toml
fi

docker-compose -f docker-compose-with-node.yml up -d --remove-orphans
