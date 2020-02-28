const {	parseNrun, buildScrapeTargets, logger, MetricServer } = require('../lib')
const { register } = require('prom-client')
const { assert, expect, } = require('chai')
const chai = require('chai')
const chaiHttp = require('chai-http')
const _ = require('lodash')

chai.use(chaiHttp)

beforeEach(() => {
	register.clear()
})

let defaultTargets = [
	{	url: 'https://api.minter.one', 					status: true, netInfo: true, 'net-info': true, candidates: true },
	{ url: 'http://api-01.minter.store:8841',	status: true,	netInfo: true, 'net-info': true, candidates: true },
]
let listeningPort = 9100
let metricsBaseUrl = `http://localhost:${listeningPort}`
let metricsSubUrl = '/metrics'
let ms = new MetricServer({ targets: defaultTargets, port: listeningPort })

describe('MetricServer', () => {

	before(done => {
		ms.run(() => setTimeout(done, 1000))
	})

	describe('get /metrics', () => {

		it('should properly return both status, net_info, candidates', (done) => {
			chai.request(metricsBaseUrl).get(metricsSubUrl).end(() => {
				chai.request(metricsBaseUrl).get(metricsSubUrl).end((err, resp) => {
					// logger.error(err)
					// logger.error(resp.text)
					done()
				})
			})
		}).timeout(10000)
	})

	after(done =>
		ms.stop(done)
	)
})
