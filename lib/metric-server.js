'use strict'

const { HttpMetricsCollector } = require('prometheus-api-metrics')
const apiMetrics = require('prometheus-api-metrics')
const ConnectSequence = require('connect-sequence')
const express	= require('express')
const logger = require('./logger')
const TendermintMetricSet = require('./tendermint-metric-set')
const { keys, assign, isUndefined, isEmpty } = require('lodash')

const ParallelRequest = require('parallel-http-request')
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
			_timeout: 1000,
			_httpMetricsPerfix: 'minter',
			_scrapeAsync: true,
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
		self._app.use((req, res, next) => {
			let seq = new ConnectSequence(req, res, next)
			seq.append((req, res, next) => {
				logger.info(`request: ${req.baseUrl}${req.originalUrl}`)
				if (req.originalUrl == '/') {
					// NOTE: make better url check
					res.send('200OK')
					return
				}
				return next()
			})
			if (self._scrapeAsync)
				seq.append( self.asyncScraperBuilder(self._targets, self._metrics, self._timeout) )
			else
				self.syncScraperBuilder(self._targets, self._metrics).forEach(scraper => seq.append(scraper))
			seq.append(self._api.bind(null, req, res))
			seq.run()
		})

		logger.warn(`Starting exporter at port ${self._port}...`)
		self._startedApp = self._app.listen(self._port, () => {
			logger.warn(`Exporter started at port ${self._port}`)
			if (callback)
				setTimeout(callback, 10)
		})
	}

	stop(callback) {
		logger.warn(`Stopping exporter at port ${this._port}...`)
		this._startedApp.close(() => {
			logger.warn(`Exporter stopped at port ${this._port}`)
			if (callback)
				callback()
		})
	}

	asyncScraperBuilder(targets, metrics, timeout=1000) {
		let asyncRequest = new ParallelRequest({ response: 'simple' })

		logger.info('#asyncScraperBuilder - building scrapers...')

		targets.forEach(target => {
			if (target.status)
				asyncRequest.add({ url: `${target.url}/status`, method: 'get', timeout: timeout })
			if (target.netInfo || target['net-info'])
				asyncRequest.add({ url: `${target.url}/net_info`, method: 'get', timeout: timeout })
			if (target.candidates)
				asyncRequest.add({ url: `${target.url}/candidates`, method: 'get', timeout: timeout })
		})

		logger.info(`#asyncScraperBuilder - success!`)

		return (req, res, next) => {
			asyncRequest.send(resp => {
				resp.forEach(response => {
					try {
						if (response.status && response.status == 200) {
							logger.info(`scrape:async -> parsing response from ${response.url}`)
							if (response.url && /\/status$/.test(response.url)) {

								let target = response.url.replace(/\/status$/, '')
								let moniker = response.body.result.tm_status.node_info.moniker
								metrics.setLabels({ moniker: moniker, target: target })
								metrics.set('status', { moniker: moniker, target: target }, response.body)

							} if (response.url && /\/candidates$/.test(response.url)) {

								let target = response.url.replace(/\/candidates$/, '')
								metrics.setLabels({ target: target })
								metrics.set('candidates', { target: target }, response.body)

							} if (response.url && /\/net_info$/.test(response.url)) {

								let target = response.url.replace(/\/net_info$/, '')
								metrics.setLabels({ target: target })
								metrics.set('net_info', { target: target }, response.body)

							}
						} else {
							logger.error(`scrape:async -> response from ${response.url} returned ${response.status}`)
							if (response.error)
								logger.error(response.error)
						}
						// HttpMetricsCollector.collect(response)
					} catch (e) {
						logger.error(e)
						logger.error(e.stack)
					}
				})

				try {
					return next()
				} catch (e) {
					logger.error(e)
					logger.error(next)
					logger.error(e.stack)
				}
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
						if (err) {
							next(err)
							return
						}
						logger.info(`scrape:sync -> parsing response from /status`)
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
						if (err) {
							next(err)
							return
						}
						logger.info(`scrape:sync -> parsing response from /net_info`)
						metrics.setLabels({ target: target.url })
						metrics.set('net_info', { target: target.url }, data)
						next()
					})
				)
			}
			if (target.candidates) {
				scrapers.push(
					(req, res, next) => this.scrape(`${target.url}/candidates`, (err, data) => {
						if (err) {
							next(err)
							return
						}
						logger.info(`scrape:sync -> parsing response from /candidates`)
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
		logger.info(`scrape:sync -> performing request to ${scrapeUrl}`)
		request({ url: scrapeUrl, time: true }, (err, resp) => {
			logger.info(`scrape:sync -> got data from ${scrapeUrl}`)
			HttpMetricsCollector.collect(err || resp)
			try {
				let body = JSON.parse(resp.body)
				callback(null, body)
			} catch (e) {
				logger.error(resp.body)
				logger.error(e)
				callback(e, resp.body)
			}
		})
	}
}

module.exports = MetricServer
