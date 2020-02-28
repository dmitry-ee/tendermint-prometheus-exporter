const {	parseNrun, buildScrapeTargets, logger, MetricServer } = require('../lib')
const { register } = require('prom-client')
const { assert, expect } = require('chai')
const _ = require('lodash')
const request	= require('request')

beforeEach(() => {
	register.clear()
})

let defaultTargets = [
	{	url: 'https://api.minter.one', 					status: true, netInfo: true, 'net-info': true, candidates: true },
	{ url: 'http://api-01.minter.store:8841',	status: true,	netInfo: true, 'net-info': true, candidates: true },
]
let listeningPort = 9100
let metricsUrl = `http://localhost:${listeningPort}/metrics`

describe('MetricServer', () => {
	describe('#constructor', () => {
		it('check for empty targets', () => {
			expect(() => ms = new MetricServer()).throw()
		})

		it('listens desired port + properly stops', (done) => {
			expect(() => {
				ms = new MetricServer({ targets: defaultTargets, port: listeningPort })
				ms.run(() => {
					request({ url: metricsUrl, time: true }, (err, resp) => {
						assert.isNull(err)
						assert.isDefined(resp)
						assert.isNotNull(resp)
						ms.stop(() => {
							request({ url: metricsUrl, time: true }, (err, resp) => {
								assert.isNotNull(err)
								done()
							})
						})
					})
				})
			}).not.throw()
		})
	})
})
