FROM  mhart/alpine-node:12.1 as builder
COPY  package.json /
RUN   set ex && npm install --production

FROM	mhart/alpine-node:slim-12.1
ARG		APP_DIR=/app
ARG   EXPORTER_VERSION=0.0.0
ENV   EXPORTER_VERSION=${EXPORTER_VERSION}
WORKDIR	$APP_DIR

ADD   ./lib ${APP_DIR}/lib
ADD   index.js  ${APP_DIR}
COPY  --from=builder /node_modules  ${APP_DIR}/node_modules

ENTRYPOINT  ["node index"]
CMD	        ["serve"]
