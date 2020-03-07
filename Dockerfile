FROM  mhart/alpine-node:12.1 as builder
COPY  package.json /
RUN   set ex && npm install --production

FROM  mhart/alpine-node:slim-12.1
ARG   APP_DIR=/app
LABEL version=${EXPORTER_VERSION} \
      org.label-schema.vcs-ref=${VCS_REF} \
      org.label-schema.vcs-url="https://github.com/dmitry-ee/tendermint-prometheus-exporter"

MAINTAINER Dmitry E <https://github.com/dmitry-ee>
WORKDIR $APP_DIR

RUN   apk add --no-cache tini

COPY  --from=builder /node_modules  ${APP_DIR}/node_modules
ADD   ./lib ${APP_DIR}/lib
ADD   index.js package.json  ${APP_DIR}/

EXPOSE 9675

ARG EXPORTER_VERSION=0.0.0
ARG VCS_REF
ARG BUILD_DATE
ENV EXPORTER_VERSION=${EXPORTER_VERSION}

ENTRYPOINT ["/sbin/tini", "--", "/usr/bin/node", "index"]
CMD ["serve"]
