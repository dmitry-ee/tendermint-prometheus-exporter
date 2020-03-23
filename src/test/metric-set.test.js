const { assert, expect } = require('chai')
const { MetricSet, logger } = require('../lib')
const { register } = require('prom-client')
const util = require('util')
const _ = require('lodash')

beforeEach(() => {
	register.clear()
})

describe('MetricSet', () => {
	describe('#constructor', () => {
		it('proper init', () => {
			expect(() => { ms = new MetricSet({ prefix: 'blabla' }) }).not.throw()
			assert.equal(ms._prefix, 'blabla')
		})
	})

	describe('#add', () => {
		it('add without context fails', () => {
			ms = new MetricSet({ labels: { label1: "value1" } })
			expect(() => ms.add({ })).to.throw()
		})

		it('should throw error upon add with wrong context', () => {
			ms = new MetricSet({ labels: { label1: "value1" } })
			expect(() => ms.add([], {})).to.throw()
		})

		it('proper add with pre-initiated labels', () => {
			let l = { label1: "value1" }
			let ms = new MetricSet({ prefix: 'my_prefix', labels: l })
			expect(() => ms.add('my_context', { })).not.to.throw()
			assert.equal(ms._metricSet["my_context"].length, 1)
			assert.equal(ms._metricSet["my_context"][0]._prefix, 'my_prefix_my_context')
			assert.isDefined(ms._metricSet["my_context"][0]._labels['label1'])
			assert.equal(ms._metricSet["my_context"][0]._labels['label1'], l['label1'])
			assert.equal(_.keys(ms._metricSet["my_context"][0]._labels).length, 1)
		})

		it('multiple contexts', () => {
			ms = new MetricSet()
			ms.add('context1', {})
			ms.add('context2', {})
			assert.isDefined(ms._metricSet['context1'])
			assert.isDefined(ms._metricSet['context2'])
		})
	})

	describe('#set', () => {
		it('should return false if context not found', () => {
			let ms = new MetricSet()
			ms.add('context', {})
			assert.isFalse(ms.set('pokerface'))
		})

		it('should throw exception upon wrong #context', () => {
			let ms = new MetricSet()
			expect(() => ms.set({})).to.throw()
		})

		it('should properly set one added metric', () => {
			let ms = new MetricSet()
			c = 'context'
			ms.add(c, {})
			ms.set(c, {}, 1234)
			assert.equal(ms._metricSet[c][0]._metric.hashMap[''].value, 1234)
		})

		it('set label after metric add', () => {
			let ms = new MetricSet({ labels: { label1: 'value1' } })
			c = 'context'
			ms.add(c, {})
			ms.set(c, {}, 1234)
			expect(() => ms.setLabels({ label2: 'value2' })).not.throw()
			expect(() => ms.setLabels({ label3: 'value3' })).not.throw()
			ms._labels = {}
			assert.notEmpty(_.keys(ms._metricSet[c][0]._labels))
			ms.setLabels({})
			logger.warn(ms.metrics)
			assert.isUndefined(ms._metricSet[c][0]._labels['label2'])
			assert.isUndefined(ms._metricSet[c][0]._labels['label3'])
		})

		it('should contain metrics with different labels', () => {
			let ms = new MetricSet({ labels: { label1: 'value1' } })
			c = 'context'
			ms.add(c, { name: '1234' })
			ms.add(c, { name: '12345', labelNames: ['label2'] })
			assert.isUndefined(ms._metricSet[c][0]._labels['label2'])
			assert.isDefined(ms._metricSet[c][0]._labels['label1'])
			assert.isDefined(ms._metricSet[c][1]._labels['label1'])
			assert.notEqual(_.keys(ms._metricSet[c][0]._labels).length, _.keys(ms._metricSet[c][1]._labels).length)
			ms.set(c, {}, 1)
		})

		it('should contain metrics with different labels AFTER SET', () => {
			let ms = new MetricSet({ labels: { label1: 'value1' } })
			c = 'context'
			ms.add(c, { name: '1234' })
			ms.add(c, { name: '12345', labelNames: ['label2'] })
			ms.set(c, {}, 1)
			let [m1, m2] = [ms.metrics[0], ms.metrics[1]]
			let [h1, h2] = [m1.hashMap['label1:value1'], m2.hashMap['label1:value1,label2:']]
			assert.isDefined(h1)
			assert.isDefined(h2)
			assert.equal(h1.value, h2.value)
		})
	})

	describe('#setLabels', () => {
		it('label merge works well', () => {
			l = { label1: "value1" }
			ms = new MetricSet({ prefix: 'my_prefix', labels: l })
			ms.setLabels({ label2: 'value2' })
			assert.equal(_.keys(ms._labels).length, 2)
		})

		it('label proper proxying to added metrics', () => {
			let ms = new MetricSet({ prefix: 'my_prefix', labels: { label1: "value1" } })
			ms.add('context', {})
			ms.setLabels({ label2: 'value2' })
			let m = ms._metricSet["context"][0]
			assert.equal(m._labelNames.length, 2)
			assert.isEmpty(_.difference(m._labelNames, [ 'label1', 'label2' ]))
			assert.equal(m._labels['label1'], 'value1')
			assert.equal(m._labels['label2'], 'value2')
		})
	})
})
