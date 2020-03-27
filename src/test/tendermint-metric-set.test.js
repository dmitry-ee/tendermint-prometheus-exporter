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
        logger.info(`extracting ${m.name}`)
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

    it('#candidatesExtractor should not add labels and metric with undefined labels', () => {
      let tm = new TendermintMetricSet()
      let mockData
      expect(() => { mockData = JSON.parse(fs.readFileSync('test/mock/candidates_empty.json'))} ).not.throw()
      tm.set('candidates', {}, mockData)
      assert.equal(tm.metrics.length, 2)
      tm.metrics.forEach(m => {
        assert.isNotEmpty(_.keys(m.hashMap))
        // should not return 2 metrics: one with empty total_stake other with missing_status
        assert.equal(_.keys(m.hashMap).length, 2)
        assert.notEqual(m.hashMap[_.keys(m.hashMap)[0]].value, -1)

        _.values(m.hashMap).forEach(h => {
          // if created_at_block is missing should return -1
          if (h.labels.reward_addres == "MISSING_CREATED_AT_BLOCK") assert.equal(h.labels.created_at_block, -1)
          // check if that's metric is not about stake
          if (h.labels.reward_addres == "MISSING_TOTAL_STAKE") assert.equal(m.name, "minter_candidates_info_status")
          // and this metric not about status
          if (h.labels.reward_addres == "MISSING_STATUS") assert.equal(m.name, "minter_candidates_info_stake")
        })
      })
    })
  })
})
