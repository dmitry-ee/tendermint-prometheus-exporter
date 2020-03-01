const {	parseNrun, buildScrapeTargets, logger, MetricServer } = require('../lib')
const { register } = require('prom-client')
const { assert, expect } = require('chai')
const chai = require('chai')
const chaiHttp = require('chai-http')
const _ = require('lodash')

chai.use(chaiHttp)

beforeEach(() => {
	register.clear()
})

let defaultTargets = [
	{	url: 'https://api.minter.one', 					status: true, netInfo: true, 'net-info': true, candidates: true },
	// { url: 'http://api-01.minter.store:8841',	status: true,	netInfo: true, 'net-info': true, candidates: true },
]
let listeningPort = 9100
let metricsBaseUrl = `http://localhost:${listeningPort}`
let metricsSubUrl = '/metrics'

describe('MetricServer', () => {
	describe('#constructor', () => {

		beforeEach(done => {
			register.clear()
			done()
		})

		it('check for empty targets', () => {
			expect(() => new MetricServer()).throw()
		})

		it('check what if targets misuse', () => {
			expect(() => new MetricServer({ targets: [{ abc: 'http://trololo' }] })).throw()
			register.clear()
			expect(() => new MetricServer({ targets: [{ url: 'http://trololo' }] })).not.throw()
			register.clear()
			expect(() => new MetricServer({ targets: [{ url: 'http://trololo', status: true }] })).not.throw()
			register.clear()
			expect(() => new MetricServer({ targets: [{ url: 'http://trololo', status: true, netInfo: true }] })).not.throw()
			register.clear()
			expect(() => new MetricServer({ targets: [{ url: 'http://trololo', status: true, netInfo: true, candidates: true }] })).not.throw()
		})

		it('listens desired port + properly stops', (done) => {
			expect(() => {
				ms = new MetricServer({ targets: defaultTargets, port: listeningPort })
				ms.run(() => {
					chai.request(metricsBaseUrl).get(metricsSubUrl).end((err, resp) => {
						assert.isNull(err)
						assert.isDefined(resp)
						assert.isNotNull(resp)
						ms.stop(() => {
							chai.request(metricsBaseUrl).get(metricsSubUrl).end((err, resp) => {
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
