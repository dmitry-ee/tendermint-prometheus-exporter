const { assert, expect } = require('chai')
const { TendermintMetricSet, logger } = require('../lib')
const { register, Prometheus } = require('prom-client')
const util = require('util')
const _ = require('lodash')
const fs = require('fs')

beforeEach(() => {
	register.clear()
})

logObject = (obj) => {
	console.log(util.inspect(obj, false, null))
}

fillMetricSetWithMockData = (mockFile, ms) => {

}

logNetInfoMetric = metricSet => {
	metricSet._metricSet["net_info"].forEach(m => {
		_.keys(m.metric.hashMap).forEach(k => {
			console.log(`${m.name}\t\{${k}\}\t= ${m.metric.hashMap[k].value}`)
		})
	})
}

describe('TendermintMetricSet', () => {
	describe('#constructor', () => {

		it('fill #candidates with array\'nt', () => {
			let tm = new TendermintMetricSet()
			tm.set('candidates', {}, {})
			tm.metrics.forEach(m => assert.isEmpty(_.keys(m.hashMap)) )
		})

		it('fill with #status data', () => {
			let tm = new TendermintMetricSet()
			let mockData
			expect(() => { mockData = JSON.parse(fs.readFileSync('test/mock/status.json'))} ).not.throw()
			tm.setLabels({ target: "mock", moniker: mockData.result.tm_status.node_info.moniker })
			tm.set('status', {}, mockData)
			tm.metrics.forEach(m => {
				assert.isNotEmpty(_.keys(m.hashMap))
				assert.notEqual(m.hashMap[_.keys(m.hashMap)[0]].value, -1)
			})
		})

		it('fill with #candidates data', () => {
			let tm = new TendermintMetricSet()
			let mockData
			expect(() => { mockData = JSON.parse(fs.readFileSync('test/mock/candidates.json'))} ).not.throw()
			tm.set('candidates', {}, mockData)
			tm.metrics.forEach(m => {
				assert.isNotEmpty(_.keys(m.hashMap))
				assert.notEqual(m.hashMap[_.keys(m.hashMap)[0]].value, -1)
			})
		})

		it('fill #net_info with array\'nt', () => {
			let tm = new TendermintMetricSet()
			tm.set('net_info', {}, false)
			tm.metrics.forEach(m => assert.isEmpty(_.keys(m.hashMap)) )
		})

		it('fill with #net_info data', () => {
			let tm = new TendermintMetricSet()
			let mockData
			expect(() => { mockData = JSON.parse(fs.readFileSync('test/mock/net_info.json'))} ).not.throw()
			tm.set('net_info', {}, mockData)
			tm.metrics.forEach(m => {
				assert.isNotEmpty(_.keys(m.hashMap))
				assert.notEqual(m.hashMap[_.keys(m.hashMap)[0]].value, -1)
			})
		})
	})
})
