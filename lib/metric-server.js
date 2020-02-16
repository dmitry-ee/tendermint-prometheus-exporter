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

		if (isUndefined(this._targets) || isEmpty(this._targets))
			throw new Error('scrape targets (--target flag) cannot be undefined!')
	}

	run() {
		let self = this
		self._app.use(function(req, res, next) {
			let seq = new ConnectSequence(req, res, next)
			seq.append(
				self.scraper(self._targets, self._metrics),
				self._api.bind(null, req, res)
			).run()
		})

		self._app.listen(self._port, function() { logger.warn(`Exporter started at port ${self._port}`) })
	}

	scraper(targets, metrics) {
		logger.warn(targets)
		return (req, res, next) => {
			targets.forEach(nodeUrl => {
				let moniker = ''
				request({ url: `${nodeUrl}/status`, time: true }, (err, response) => {
					HttpMetricsCollector.collect(err || response)
					try {
						let responseBody = JSON.parse(response.body)
						moniker = responseBody.result.tm_status.node_info.moniker
						metrics.setLabels({ moniker: moniker, target: nodeUrl })
						metrics.set('status', {}, responseBody)

					} catch (e) {	logger.logHttpResponse(response, 'error'), logger.error(e)	}
				}),
				request({ url: `${nodeUrl}/net_info`, time: true }, (err, response) => {
					HttpMetricsCollector.collect(err || response)
					try {
						let responseBody = JSON.parse(response.body)
						metrics.setLabels({ target: nodeUrl })
						metrics.set('net_info', { target: nodeUrl }, responseBody)

					} catch (e) { logger.logHttpResponse(response, 'error'), logger.error(e) }
				})
			})
			next()
		}
	}
}

module.exports = MetricServer
