'use strict'

const { HttpMetricsCollector } = require('prometheus-api-metrics')
const apiMetrics = require('prometheus-api-metrics')
const ConnectSequence = require('connect-sequence')
const express	= require('express')
const logger = require('./logger')
const TendermintMetricSet = require('./tendermint-metric-set')
const { keys, assign, isUndefined, isEmpty } = require('lodash')

const ParallelRequest = require('parallel-http-request')
const asyncRequest = new ParallelRequest({ response: 'simple' })
const request	= require('request')

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
			_scrapeAsync: true,
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
			if (self._scrapeAsync)
				seq.append( self.asyncScraperBuilder(self._targets, self._metrics) )
			else
				self.syncScraperBuilder(self._targets, self._metrics).forEach(scraper => seq.append(scraper))
			seq.append(self._api.bind(null, req, res))
			seq.run()
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

	asyncScraperBuilder(targets, metrics) {
		logger.info('#asyncScraperBuilder - building scrapers...')

		targets.forEach(target => {
			if (target.status)
				asyncRequest.add({ url: `${target.url}/status`, method: 'get' })
			if (target.netInfo || target['net-info'])
				asyncRequest.add({ url: `${target.url}/net_info`, method: 'get' })
			if (target.candidates)
				asyncRequest.add({ url: `${target.url}/candidates`, method: 'get' })
		})

		logger.info(`#asyncScraperBuilder - success!`)

		return (req, res, next) => {
			asyncRequest.send(resp => {
				resp.forEach(response => {
					if (response.status == 200) {
						logger.info(`parsing response from ${response.url}`)
						if (response.url && /\/status$/.test(response.url)) {

							let target = response.url.replace(/\/status$/, '')
							let moniker = response.body.result.tm_status.node_info.moniker
							metrics.setLabels({ moniker: moniker, target: target })
							metrics.set('status', {}, response.body)

						} if (response.url && /\/candidates$/.test(response.url)) {

							let target = response.url.replace(/\/candidates$/, '')
							metrics.setLabels({ target: target })
							metrics.set('net_info', { target: target.url }, response.body)

						} if (response.url && /\/net_info$/.test(response.url)) {

							let target = response.url.replace(/\/net_info$/, '')
							metrics.setLabels({ target: target })
							metrics.set('candidates', { target: target.url }, response.body)

						}
					} else {
						logger.error(`response from ${response.url} returned ${response.status}`)
						logger.error(response.body)
					}
				})
				next()
			})
		}
	}

	syncScraperBuilder(targets, metrics) {

		logger.info('#syncScraperBuilder - building scrapers...')
		let scrapers = []

		targets.forEach(target => {
			if (target.status) {
				scrapers.push(
					(req, res, next) => this.scrape(`${target.url}/status`, (err, data) => {
						logger.info(`parsing response from /status`)
						let moniker = data.result.tm_status.node_info.moniker
						metrics.setLabels({ moniker: moniker, target: target.url })
						metrics.set('status', {}, data)
						next()
					})
				)
			}
			if (target.netInfo || target['net-info']) {
				scrapers.push(
					(req, res, next) => this.scrape(`${target.url}/net_info`, (err, data) => {
						logger.info(`parsing response from /net_info`)
						metrics.setLabels({ target: target.url })
						metrics.set('net_info', { target: target.url }, data)
						next()
					})
				)
			}
			if (target.candidates) {
				scrapers.push(
					(req, res, next) => this.scrape(`${target.url}/candidates`, (err, data) => {
						logger.info(`parsing response from /candidates`)
						metrics.setLabels({ target: target.url })
						metrics.set('candidates', { target: target.url }, data)
						next()
					})
				)
			}
		})

		logger.info(`#syncScraperBuilder - success!`)
		logger.info(scrapers)
		return scrapers
	}

	scrape(scrapeUrl, callback) {
		logger.info(`performing request to ${scrapeUrl}`)
		request({ url: scrapeUrl, time: true }, (err, resp) => {
			logger.info(`got data from ${scrapeUrl}`)
			HttpMetricsCollector.collect(err || resp)
			try {
				let body = JSON.parse(resp.body)
				callback(null, body)
			} catch (e) {
				logger.logHttpResponse(resp, 'error')
				logger.error(e)
				callback(e, resp)
			}
		})
	}

	// scraper(targets, metrics) {
	// 	logger.info(`#scraper ${JSON.stringify(targets)}`)
	// 	return (req, res, next) => {
	// 		logger.info(`#performing request to ${JSON.stringify(targets)}...`)
	// 		targets.forEach(target => {
	// 			let moniker = ''
	// 			target.status ? request({ url: `${target.url}/status`, time: true }, (err, response) => {
	// 				logger.info(`got data from ${target.url}/status`)
	// 				HttpMetricsCollector.collect(err || response)
	// 				try {
	// 					let responseBody = JSON.parse(response.body)
	// 					moniker = responseBody.result.tm_status.node_info.moniker
	// 					metrics.setLabels({ moniker: moniker, target: target.url })
	// 					metrics.set('status', {}, responseBody)
	//
	// 				} catch (e) {	logger.logHttpResponse(response, 'error'), logger.error(e)	}
	// 			}) : undefined,
	// 			(target.netInfo || target['net-info']) ? request({ url: `${target.url}/net_info`, time: true }, (err, response) => {
	// 				logger.info(`got data from ${target.url}/net_info`)
	// 				HttpMetricsCollector.collect(err || response)
	// 				try {
	// 					let responseBody = JSON.parse(response.body)
	// 					metrics.setLabels({ target: target.url })
	// 					metrics.set('net_info', { target: target.url }, responseBody)
	//
	// 				} catch (e) { logger.logHttpResponse(response, 'error'), logger.error(e) }
	// 			}) : undefined,
	// 			target.candidates ? request({ url: `${target.url}/candidates`, time: true }, (err, response) => {
	// 				logger.info(`got data from ${target.url}/candidates`)
	// 				HttpMetricsCollector.collect(err || response)
	// 				try {
	// 					let responseBody = JSON.parse(response.body)
	// 					metrics.setLabels({ target: target.url })
	// 					metrics.set('candidates', { target: target.url }, responseBody)
	//
	// 				} catch (e) { logger.logHttpResponse(response, 'error'), logger.error(e) }
	// 			}) : undefined
	// 		})
	// 		next()
	// 	}
	// }
}

module.exports = MetricServer
