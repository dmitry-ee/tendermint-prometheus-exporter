const {	parseNrun, buildScrapeTargets, logger, MetricServer } = require('../lib')
const { register } = require('prom-client')
const { assert, expect, } = require('chai')
const chai = require('chai')
const chaiHttp = require('chai-http')
const _ = require('lodash')

chai.use(chaiHttp)

let defaultTargets = [
	{	url: 'https://api.minter.one', 					status: true, netInfo: true, 'net-info': true, candidates: true },
	{ url: 'http://api-01.minter.store:8841',	status: true,	netInfo: true, 'net-info': true, candidates: true },
]
let listeningPort = 9100
let metricsBaseUrl = `http://localhost:${listeningPort}`
let metricsSubUrl = '/metrics'
let ms

const countOfMatches = (arrOfStrings, regex) => {
	var i = 0
	arrOfStrings.forEach( str => str.match(new RegExp(regex)) ? i++ : 0 )
	return i
}

beforeEach(done => {
	register.clear()
	done()
})

describe('#MetricServer#sync', () => {

	before(done => {
		ms = new MetricServer({ targets: defaultTargets, port: listeningPort, scrapeAsync: false })
		ms.run(() => setTimeout(done, 10))
	})

	describe('get /metrics', () => {

		it('should properly return both status, net_info, candidates', (done) => {
			chai.request(metricsBaseUrl).get(metricsSubUrl).end((err, resp) => {
				// logger.error(err)
				respLines = resp.text.split(/\r?\n/)
				assert.isAbove(countOfMatches(respLines, /minter_/), 4)
				assert.isAbove(countOfMatches(respLines, /_net_info_/), 4)
				assert.isAbove(countOfMatches(respLines, /_candidates_/), 4)
				assert.equal(countOfMatches(respLines, /moniker=""/), 0)
				defaultTargets.forEach(target => assert.isAbove(countOfMatches(respLines, `${target.url}`), 0))
				defaultTargets.forEach(target => assert.equal(countOfMatches(respLines, `${target.url}/status`), 0))
				defaultTargets.forEach(target => assert.equal(countOfMatches(respLines, `${target.url}/net_info`), 0))
				defaultTargets.forEach(target => assert.equal(countOfMatches(respLines, `${target.url}/candidates`), 0))
				done()
			})
		}).timeout(10000)
	})

	after(done =>
		ms.stop(done)
	)
})

describe('#MetricServer#async', () => {

	before(done => {
		ms = new MetricServer({ targets: defaultTargets, port: listeningPort, scrapeAsync: true })
		ms.run(() => setTimeout(done, 10))
	})

	describe('get /metrics', () => {

		it('should properly return both status, net_info, candidates', (done) => {
			chai.request(metricsBaseUrl).get(metricsSubUrl).end((err, resp) => {
				// logger.error(err)
				respLines = resp.text.split(/\r?\n/)
				assert.isAbove(countOfMatches(respLines, /minter_/), 4)
				assert.isAbove(countOfMatches(respLines, /_net_info_/), 4)
				assert.isAbove(countOfMatches(respLines, /_candidates_/), 4)
				assert.equal(countOfMatches(respLines, /moniker=""/), 0)
				defaultTargets.forEach(target => assert.isAbove(countOfMatches(respLines, `${target.url}`), 0))
				defaultTargets.forEach(target => assert.equal(countOfMatches(respLines, `${target.url}/status`), 0))
				defaultTargets.forEach(target => assert.equal(countOfMatches(respLines, `${target.url}/net_info`), 0))
				defaultTargets.forEach(target => assert.equal(countOfMatches(respLines, `${target.url}/candidates`), 0))
				done()
			})
		}).timeout(10000)
	})

	after(done =>
		ms.stop(done)
	)
})

describe('#MetricServer#sync : error handling (invalid scrape urls)', () => {

	before(done => {
		ms = new MetricServer({ targets: [{ url: 'https://google.com', status: true, netInfo: true, candidates: true }], port: listeningPort, scrapeAsync: false })
		ms.run(() => setTimeout(done, 10))
	})

	describe('get /metrics', () => {

		it('should properly return both status, net_info, candidates', (done) => {
			expect(() => chai.request(metricsBaseUrl).get(metricsSubUrl).end((err, resp) => {
				// logger.error(err)
				done()
			})).not.throw()
		}).timeout(10000)
	})

	after(done =>
		ms.stop(done)
	)
})

describe('#MetricServer#async : error handling (invalid scrape urls)', () => {

	before(done => {
		ms = new MetricServer({ targets: [{ url: 'https://google.com', status: true, netInfo: true, candidates: true }], port: listeningPort, scrapeAsync: true })
		ms.run(() => setTimeout(done, 10))
	})

	describe('get /metrics', () => {

		it('should properly return both status, net_info, candidates', (done) => {
			expect(() => chai.request(metricsBaseUrl).get(metricsSubUrl).end((err, resp) => {
				// logger.error(err)
				done()
			})).not.throw()
		}).timeout(10000)
	})

	after(done =>
		ms.stop(done)
	)
})
