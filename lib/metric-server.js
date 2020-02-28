'use strict'

const { HttpMetricsCollector } = require('prometheus-api-metrics')
const apiMetrics = require('prometheus-api-metrics')
const ConnectSequence = require('connect-sequence')
const express	= require('express')
const request	= require('request')
const logger = require('./logger')
const TendermintMetricSet = require('./tendermint-metric-set')
const { keys, assign, isUndefined, isEmpty } = require('lodash')

class MetricServer {

	constructor(options = {}) {

		keys(options).forEach((k) => {
			options[`_${k}`] = options[k]
			delete options[k]
		})

		assign(this, {
			_port: 9675,
			_targets: [],
			_targetOpts: [],
			_timeout: 100,
			_httpMetricsPerfix: 'minter',
		}, options)

		this._app = express()
		this._api = apiMetrics({ metricsPrefix: this._httpMetricsPerfix})
		this._metrics = new TendermintMetricSet()
		HttpMetricsCollector.init({ prefix: this._httpMetricsPerfix })

		logger.info(`got targets = ${JSON.stringify(this._targets)}`)
		this._targets.forEach(x => {
			if (!x.status && !x.netInfo && !x.candidates)
				logger.warn(`status, net-info and candidates are all diasbled for url='${x.url}'`)
		})

		if (isUndefined(this._targets) || isEmpty(this._targets))
			throw new Error('scrape targets (--target flag) cannot be undefined!')
	}

	run(callback = () => {}) {
		let self = this
		self._app.use((req, res, next) => {
			let seq = new ConnectSequence(req, res, next)
			seq.append(
				self.scraper(self._targets, self._metrics),
				self._api.bind(null, req, res)
			).run()
		})

		logger.warn(`Starting exporter at port ${self._port}...`)
		self._startedApp = self._app.listen(self._port, () => {
			logger.warn(`Exporter started at port ${self._port}`),
			setTimeout(() => callback(), 10)
		})
	}

	stop(callback = () => {}) {
		logger.warn(`Stopping exporter at port ${this._port}...`)
		this._startedApp.close(() => {
			logger.warn(`Exporter stopped at port ${this._port}`),
			callback()
		})
	}

	scraper(targets, metrics) {
		logger.info(`#scraper ${JSON.stringify(targets)}`)
		return (req, res, next) => {
			logger.info(`#performing request to ${JSON.stringify(targets)}...`)
			targets.forEach(target => {
				let moniker = ''
				target.status ? request({ url: `${target.url}/status`, time: true }, (err, response) => {
					logger.info(`got data from ${target.url}/status`)
					HttpMetricsCollector.collect(err || response)
					try {
						let responseBody = JSON.parse(response.body)
						moniker = responseBody.result.tm_status.node_info.moniker
						metrics.setLabels({ moniker: moniker, target: target.url })
						metrics.set('status', {}, responseBody)

					} catch (e) {	logger.logHttpResponse(response, 'error'), logger.error(e)	}
				}) : undefined,
				(target.netInfo || target['net-info']) ? request({ url: `${target.url}/net_info`, time: true }, (err, response) => {
					logger.info(`got data from ${target.url}/net_info`)
					HttpMetricsCollector.collect(err || response)
					try {
						let responseBody = JSON.parse(response.body)
						metrics.setLabels({ target: target.url })
						metrics.set('net_info', { target: target.url }, responseBody)

					} catch (e) { logger.logHttpResponse(response, 'error'), logger.error(e) }
				}) : undefined,
				target.candidates ? request({ url: `${target.url}/candidates`, time: true }, (err, response) => {
					logger.info(`got data from ${target.url}/candidates`)
					HttpMetricsCollector.collect(err || response)
					try {
						let responseBody = JSON.parse(response.body)
						metrics.setLabels({ target: target.url })
						metrics.set('candidates', { target: target.url }, responseBody)

					} catch (e) { logger.logHttpResponse(response, 'error'), logger.error(e) }
				}) : undefined
			})
			next()
		}
	}
}

module.exports = MetricServer
