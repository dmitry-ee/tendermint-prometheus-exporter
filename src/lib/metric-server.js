'use strict'

const { HttpMetricsCollector } = require('prometheus-api-metrics')
const apiMetrics = require('prometheus-api-metrics')
const ConnectSequence = require('connect-sequence')
const express = require('express')
const logger = require('./logger')
const TendermintMetricSet = require('./tendermint-metric-set')
const { keys, assign, isUndefined, isEmpty } = require('lodash')
const { register } = require('prom-client')
const { setIntervalAsync } = require('set-interval-async/dynamic')
const { clearIntervalAsync } = require('set-interval-async')

const ParallelRequest = require('parallel-http-request')
const request = require('request')

class MetricServer {

  constructor(options = {}) {

    keys(options).forEach((k) => {
      options[`_${k}`] = options[k]
      delete options[k]
    })

    assign(this, {
      _port: 9697,
      _targets: [],
      _targetOpts: [],
      _timeout: 1000,
      _httpMetricsPerfix: 'minter',
      _metricsRetention: 3600000,
    }, options)

    this._app = express()
    this._api = apiMetrics({ metricsPrefix: this._httpMetricsPerfix})
    this._metrics = new TendermintMetricSet()
    HttpMetricsCollector.init({ prefix: this._httpMetricsPerfix })

    logger.info(`got targets = ${JSON.stringify(this._targets)}`)
    this._targets.forEach(x => {
      if (isUndefined(x.url))
        throw new Error(`url for ${JSON.parse(x)} is unfefined!`)
      if (isUndefined(x.status) && isUndefined(x.netInfo) && isUndefined(x.candidates))
        logger.warn(`status, net-info and candidates are all diasbled for url='${x.url}'`)
    })

    if (isUndefined(this._targets) || isEmpty(this._targets))
      throw new Error('scrape targets (--target flag) cannot be undefined!')
  }

  run(callback) {
    let self = this
    self._app.use((appReq, appRes, appNext) => {
      let seq = new ConnectSequence(appReq, appRes, appNext)
      seq.append((req, res, next) => {
        logger.info(`request: ${req.baseUrl}${req.originalUrl}`)
        if (!/^\/metrics(\.json)?$/.test(req.originalUrl)) {
          logger.info(`unknown url '${req.baseUrl}${req.originalUrl}', just sayin' hi`)
          res.set('Content-Type', 'text/html')
          res.status(200).send('200 OK\n')
          return
        }
        return next()
      })
      seq.append(self.asyncScraperBuilder(self._targets, self._metrics, self._timeout))
      seq.append(self._api.bind(null, appReq, appRes))
      seq.run()
    })

    logger.warn(`Starting exporter at port ${self._port}...`)

    self._startedApp = self._app.listen(self._port, () => {
      logger.warn(`Exporter started at port ${self._port}`)

      if (self._metricsRetention) {
        logger.warn(`Setting retention timeout for ${self._metricsRetention} ms. (${self._metricsRetention/1000/60} min.)`)
        self._asyncTimer = setIntervalAsync(() => {
          logger.warn('Metrics retenton...')
          register.resetMetrics()
        }, self._metricsRetention)
      }

      if (callback)
        setTimeout(callback, 10)
    })
  }

  stop(callback) {
    logger.warn(`Stopping exporter at port ${this._port}...`)
    if (this._asyncTimer) {
      logger.info(`Stopping retention job`)
      clearIntervalAsync(this._asyncTimer)
    }
    this._startedApp.close(() => {
      logger.warn(`Exporter stopped at port ${this._port}`)
      if (callback)
        callback()
    })
  }

  asyncScraperBuilder(targets, metrics, timeout=1000) {
    let asyncRequest = new ParallelRequest({ response: 'simple' })

    logger.debug('#asyncScraperBuilder - building scrapers...')

    targets.forEach(target => {
      if (target.status)
        asyncRequest.add({ url: `${target.url}/status`, method: 'get', timeout: timeout })
      if (target.netInfo || target['net-info'])
        asyncRequest.add({ url: `${target.url}/net_info`, method: 'get', timeout: timeout })
      if (target.candidates)
        asyncRequest.add({ url: `${target.url}/candidates`, method: 'get', timeout: timeout })
    })

    logger.debug(`#asyncScraperBuilder - success!`)

    return (req, res, next) => {
      asyncRequest.send(resp => {
        resp.forEach(response => {
          if (response.status && response.status == 200) {
            logger.info(`scrape:async -> parsing response from ${response.url}`)
            if (response.url && /\/status$/.test(response.url)) {

              let target = response.url.replace(/\/status$/, '')
              let moniker
              if (!isUndefined(response.body.result.tm_status.node_info.moniker))
                moniker = response.body.result.tm_status.node_info.moniker
              metrics.setLabels({ moniker: moniker, target: target })
              metrics.set('status', { moniker: moniker, target: target }, response.body)

            } else if (response.url && /\/candidates$/.test(response.url)) {

              let target = response.url.replace(/\/candidates$/, '')
              metrics.setLabels({ target: target })
              metrics.set('candidates', { target: target }, response.body)

            } else if (response.url && /\/net_info$/.test(response.url)) {

              let target = response.url.replace(/\/net_info$/, '')
              metrics.setLabels({ target: target })
              metrics.set('net_info', { target: target }, response.body)

            }
          } else {
            logger.error(`scrape:async -> response from ${response.url} returned ${response.status}`)
            logger.error(response.error)
          }
          HttpMetricsCollector.collect(response)
        })

        next()
      })
    }
  }
}

module.exports = MetricServer
