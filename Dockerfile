FROM  mhart/alpine-node:12.1 as builder
COPY  package.json /
RUN   set ex && npm install --production

FROM	mhart/alpine-node:slim-12.1
LABEL maintainer="Dmitry E <https://github.com/dmitry-ee>"
ARG		APP_DIR=/app
ARG   EXPORTER_VERSION=0.0.0
ENV   EXPORTER_VERSION=${EXPORTER_VERSION}
WORKDIR	$APP_DIR

RUN 	apk add --no-cache tini

COPY  --from=builder /node_modules  ${APP_DIR}/node_modules
ADD   ./lib ${APP_DIR}/lib
ADD   index.js package.json  ${APP_DIR}/

EXPOSE 9675
ENTRYPOINT  ["/sbin/tini", "--", "/usr/bin/node", "index"]
CMD		["serve"]