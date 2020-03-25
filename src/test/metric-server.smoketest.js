const {	parseNrun, buildScrapeTargets, logger, MetricServer } = require('../lib')
const { register } = require('prom-client')
const { assert, expect, } = require('chai')
const chai = require('chai')
const chaiHttp = require('chai-http')
const _ = require('lodash')

chai.use(chaiHttp)

const countOfMatches = (arrOfStrings, regex) => {
	var i = 0
	arrOfStrings.forEach( str => str.match(new RegExp(regex)) ? i++ : 0 )
	return i
}

describe('#MetricServer #SMOKE', () => {

	describe('get /metrics', () => {

		describe('get /', () => {
			it('should return 200', () => {
				chai.request('http://localhost:9697').get('/').end((err, resp) => {
					assert.isNull(err)
					assert.isDefined(resp)
					assert.equal(resp.status, 200)
					assert.equal(resp.text, '200 OK\n')
				})
			})
		})

		it('should properly return both status, net_info, candidates', (done) => {
			chai.request('http://localhost:9697').get('/metrics').end((err, resp) => {
				// logger.error(err)
				respLines = resp.text.split(/\r?\n/)
				assert.isAbove(countOfMatches(respLines, /minter_/), 4)
				assert.isAbove(countOfMatches(respLines, /_net_info_/), 4)
				assert.isAbove(countOfMatches(respLines, /_candidates_/), 4)
				assert.equal(countOfMatches(respLines, /moniker=""/), 0)
				// targets should not have any url part
				assert.equal(countOfMatches(respLines, `/status`), 0)
				assert.equal(countOfMatches(respLines, `/net_info`), 0)
				assert.equal(countOfMatches(respLines, `/candidates`), 0)
				done()
			})
		}).timeout(10000)
	})
})
