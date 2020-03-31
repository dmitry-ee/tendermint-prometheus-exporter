# Tendermint Exporter [![Version](https://images.microbadger.com/badges/version/dmi7ry/tendermint-prometheus-exporter.svg)](https://hub.docker.com/r/dmi7ry/tendermint-prometheus-exporter/tags?page=1&ordering=last_updated)
[![GitHub Actions](https://github.com/dmitry-ee/tendermint-prometheus-exporter/workflows/main%20workflow/badge.svg)](https://github.com/dmitry-ee/tendermint-prometheus-exporter/actions?query=workflow%3A%22main+workflow%22)
[![Coverage Status](https://coveralls.io/repos/github/dmitry-ee/tendermint-prometheus-exporter/badge.svg?branch=master)](https://coveralls.io/github/dmitry-ee/tendermint-prometheus-exporter?branch=master)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=dmitry-ee_tendermint-prometheus-exporter&metric=security_rating)](https://sonarcloud.io/dashboard?id=dmitry-ee_tendermint-prometheus-exporter)
[![Build Automation](https://img.shields.io/docker/cloud/automated/dmi7ry/tendermint-prometheus-exporter.svg)](https://hub.docker.com/r/dmi7ry/tendermint-prometheus-exporter)
[![Image Pulls](https://img.shields.io/docker/pulls/dmi7ry/tendermint-prometheus-exporter.svg)](https://hub.docker.com/r/dmi7ry/tendermint-prometheus-exporter/tags?page=1&ordering=last_updated)

Tendermint exporter for Prometheus

## Table of Contents
- [Download](#download)
- [Run](#run)
  - [docker run](#docker-run)
    - [Example](#example)
  - [docker compose](#docker-compose)
- [Manual Build](#manual-build)
- [Flags](#flags)
- [Minter Auto Provision](#minter-auto-provision)
- [Supported Blockchains](#supported-blockchains)
  - [Minter](#minter)
    - [Grafana Dashboard](#grafana-dashboard)
    - [Metrics Sample](#metrics-sample)
  - [Cosmos](#cosmos)
    - [Metrics Sample](#metrics-sample-1)
- [Preview](#preview)
- [Donate](#donate)

## Download
```bash
docker pull dmi7ry/tendermint-prometheus-exporter:latest
```
See [DockerHub Image](https://hub.docker.com/r/dmi7ry/tendermint-prometheus-exporter)

## Run
### docker run
```bash
docker run -d -—name tendermint-exporter --rm \
  -p 9697:9697 \
  dmi7ry/tendermint-prometheus-exporter:latest \
  serve [--port N] [--timeout N] \
  [--target scrape_url_1 [--status|--no-status] [--net-info|--no-net-info] [--candidates|--no-candidates] --]
  [--target scrape_url_2 [--status|--no-status] [--net-info|--no-net-info] [--candidates|--no-candidates] --]
```
#### Example
```bash
docker run -d -—name tendermint-exporter --rm \
  -p 9697:9697 \
  dmi7ry/tendermint-prometheus-exporter:latest \
  serve --port 9697 --timeout 5000 \
  --target https://api.minter.one --status --net-info --candidates --
  --target http://my-host:8841 --status --net-info --
```
### docker-compose
See [docker-compose.yml](src/docker-compose.yml)

## Manual Build
Requirement: [Just](https://github.com/casey/just)

```bash
just build-c
```
or
```bash
just build-nc
```

## Flags
| flag name | defaults | description |
| -- | -- | -- |
| port | 9697 | port to listen at (should be exposed with -p arg) |
| timeout | 1000 | max response time to exporter waiting for in milliseconds |
| target | null | API url to scrape (port for Minter = 8841, for Cosmos = 26657) |
| status or no-status | false | enable scrape for /status url |
| net-info or no-net-info | false | enable scrape for /net_info url |
| candidates or no-candidates | false | enable scrape for /candidates url |
#### NOTE
each target should be denoted with double dash after defenition (see [docker run](#docker-run))

## Minter Auto Provision
You can install & setup full stack just in one script
```bash
git clone https://github.com/dmitry-ee/tendermint-prometheus-exporter.git
cd tendermint-prometheus-exporter/provision/
```
then run:
- `./provision-with-node.sh` for deploy Minter-Node (with enabled Prometheus), Exporter, Grafana (with Dashboard) and Prometheus
- `./provision-simply.sh` for deploy only Exporter, Grafana (with Dashboard) and Prometheus

See [provision with node](provision/provision-with-node.sh) and [provision simply](provision/provision-simply.sh)

Check & Set Minter API urls [here](provision/docker-compose-with-node.yml#L74) or [here](provision/docker-compose-simply.yml#L62)

For manual dashboard import see [Grafana Dashboard](provision/grafana/minter-dashboard.json))

## Supported Blockchains
### Minter
Supported urls:
- **/status** enables with `--status` flag
- **/net_info** enables with `--net-info` flag
- **/candidates** enables with `--candidates` flag

#### Grafana Dashboard
[here](provision/grafana/minter-dashboard.json) (importable via Import Dashboard)

#### Metrics Sample
[here](stubs/minter-metrics.txt)

### Cosmos
**NOTE: Cosmos is not supported yet**

Supported urls:
- **/net_info** enables with `--net-info` flag

#### Metrics Sample

[here](stubs/cosmos-metrics.txt)

## Preview
![Dashboard Preview](img/dashboard.gif)

## Donate
BIP: Mx65bb9548ecde11e10cd823e365fd2fb0f4f03b25

<img alt="QR" href="#" src="https://github.com/dmitry-ee/tendermint-prometheus-exporter/blob/master/img/bip.png?raw=true" width="200" height="200">
