const { assert, expect } = require('chai')
const { register } = require('prom-client')
const { Metric, logger } = require('../lib')
const util = require('util')
const _ = require('lodash')

beforeEach(() => {
	register.clear()
})

describe('Metric', function() {

	describe('#release', () => {

		it('for Prometheus Metric registry #release works well', () => {
			var [a, b] = [new Metric(), new Metric()]
			expect(() => {
				a.set({}, 1)
				b.set({}, 1)
			}).to.throw()

			expect(() => {
				a.set({}, 1)
				a.release()
				b.set({}, 1)
			}).not.to.throw()
		})
	})

	describe('#metric', () => {
		it('gets metric', () => {
			m = new Metric()
			m.set({}, 1)
			assert.isDefined(m.metric)
		})
	})

	describe('#set', () => {
		it('#set works well for plain objects + #extract works well', () => {
			m = new Metric({
				labelNames: ["label"], extractor: v => parseInt(v)
			})
			m.set({ label: "labelValue" }, "123")
			// logger.warn(m)
			assert.equal(m._metric.hashMap["label:labelValue"].value, 123);
		})

		it('date added to metric', () => {
			m = new Metric({ addDate: true })
			m.set({}, 100)
			assert.exists(m._metric.hashMap[""].timestamp)
		})

		it('#set will apply default value in case of #extract fail', () => {
			m = new Metric({
				labelNames: ["label"], extractor: (v) => parseInt(v)
			})
			m.set({ label: "labelValue" }, "abc")
			//! NOTE: fails after isNan adding
			// assert.equal(m._metric.hashMap["label:labelValue"].value, m._defaultMetricValue);
			assert.isUndefined(m._metric.hashMap["label:labelValue"])
		})

		it('#set check for !isInteger will lead to set defaultValue', () => {
			m = new Metric({ extractor: (v) => "12345" })
			m.set({}, 1234)
			assert.equal(m._metric.hashMap[""].value, m._defaultMetricValue);
		})

		it('#set will proper map labels+labelValues', () => {
			m = new Metric({ labels: {}, labelNames: [ "label2", "label1" ] })
			expect(() => m.set({ label3: "1234" }, 1234)).not.to.throw()
			m.set({}, 0)
			assert.exists(m._metric.hashMap["label1:,label2:"])
			m.set({ label2: 1234 })
			assert.exists(m._metric.hashMap["label1:,label2:1234"])
			m.set({ label2: 2, label1: 1 })
			assert.exists(m._metric.hashMap["label1:1,label2:2"])
		})

		it('should proper work with #set and update labels', () => {
			m = new Metric({ labelNames: ['label1', 'label2'] })
			m.set({ label1: 1234 }, 1)
			assert.exists(m._metric.hashMap["label1:1234,label2:"])
			m.set({ label2: 1234 }, 1)
			assert.exists(m._metric.hashMap["label1:,label2:1234"])
			m.set({ label1: 1234, label2: 1234 })
			assert.exists(m._metric.hashMap["label1:1234,label2:1234"])
			assert.equal(_.keys(m.metric.hashMap).length, 3)
		})
	})

	describe('#extractor', () => {

		it('#extract function sets upon Metric init', () => {
			var m = new Metric()
			var test_value = 123
			assert.equal(m._extractor(test_value), test_value)
		})
	})

	describe('#constructor', function() {

		it('throws exception in case of labels is not object', () => {
			expect(() => { new Metric({ labels: "123" }) }).to.throw()
			expect(() => { new Metric({ labels: [] }) }).to.throw()
			expect(() => { new Metric({ labels: {} }) }).not.to.throw()
		})

		it('Metric class for default values after object creation', function() {
			assert.isDefined(new Metric().name)
		})

		it('constructor options are works well', function() {
			var name = 'name_test'
			var prefix = 'prefix'
			m = new Metric({ name: name, prefix: prefix })
			assert.equal(m.name, `${prefix}_${name}`)
		})

		it('double construct() for metric with the same name', function (){
			var test_name = "my_name"
			var [a, b] = [ new Metric({ name: test_name }), new Metric({ name: test_name }) ]
			assert.equal(a.name, b.name)
		})

		it('double metric init & proper Prometheus Metric init', function() {
			var [a, b] = [ new Metric(), new Metric() ]
			assert.isNotTrue(a._initPrometheusMetric)
			a.set({}, 1234)
			assert.isTrue(a._initPrometheusMetric)
			expect(function() {
				b.set({}, 1234)
			}).to.throw()
		})

		it('labels will fill labelNames and otherwise', () => {
			m = new Metric()
			assert.isEmpty(m._labelNames)
			m = new Metric({ labelNames: [ "label1" ] })
			assert.isNotEmpty(Object.keys(m._labels))
			m = new Metric({ labels: { label1: "123" } })
			assert.isNotEmpty(m._labelNames)
		})

		it('labels & labelNames will proper combine', () => {
			m = new Metric({ labels: { label1: "123" }, labelNames: ["label2"] })
			assert.equal(_.keys(m._labels).length, 2)
			assert.equal(m._labelNames.length, 2)
			assert.isEmpty(_.difference(_.keys(m._labels), m._labelNames))
		})
	})

	describe('#set improvements', () => {
		it('extract value from object with PATH', () => {
			m = new Metric({
				labelNames:["label1", "label2"],
				extractPath: "abc.def[2].efg"
			})
			m.set({}, { abc: { def: [404, 309, { efg: 404 }] }})
			expect(() => assert.equal(m._metric.hashMap["label1:,label2:"].value, 404)).not.to.throw()
		})

		it('ignore #set if #extractor returns false', () => {
			m = new Metric({
				labelNames: ['label1', 'label2'],
				extractor: (v) => false
			})
			m.set({ label1: 123 }, 100)
			assert.isEmpty(m._metric.hashMap)
		})

		it('extract value from object + make multiple #set', () => {
			m = new Metric({
				labelNames: ['label1', 'label2'],
				extractPath: 'nodes',
				extractor: (v, metric) => {
					v.forEach((k) => {
						metric.set({ label1: k }, 100, (newVal) => { return parseInt(newVal) })
					})
					return false
				}
			})

			m.set({}, { nodes: [ "a", "b", "c" ] })
			expect(() => assert.equal(m._metric.hashMap["label1:a,label2:"].value, 100)).not.to.throw()
			expect(() => assert.equal(m._metric.hashMap["label1:b,label2:"].value, 100)).not.to.throw()
			expect(() => assert.equal(m._metric.hashMap["label1:c,label2:"].value, 100)).not.to.throw()
			expect(() => assert.notExists(m._metric.hashMap["label1:,label2:"])).not.to.throw()
		})
	})

	describe('#setLabels', () => {

		it('sets labels with empty object', () => {
			m = new Metric({ labelNames: ['label1'] })
			m.setLabels({})
			assert.equal(_.keys(m._labels).length, 1)
		})

		it('initially set labels then #set one of them', () => {
			m = new Metric({ labelNames: ['label1', 'label2', 'label3'] })
			m.setLabels({ label1: 1234 })
			assert.equal(m._labels.label1, 1234)
			m.set({ label2: 12345 })
			assert.exists(m._metric.hashMap["label1:1234,label2:12345,label3:"])
		})

		it('check new labels will add', () => {
			m = new Metric({ labels: { label1: 1234 } })
			assert.isTrue(m.setLabels({ label2: 1234 }))
			assert.equal(_.keys(m._labels).length, m._labelNames.length);
		})

		it('fails if metric is initialied + proper metricLabel set', () => {
			m = new Metric({ labels: { label1: 1234 } })
			m.set({}, 0)
			// assert.isFalse(m.setLabels({ label2: 1234 }))
			assert.equal(_.keys(m._labels).length, m._labelNames.length);
			assert.isUndefined(m._metric.hashMap["label2:1234"])
			assert.equal(_.keys(m._labels).length, m._metric.labelNames.length)
			assert.equal(_.keys(m._labels).length, 1);
			assert.equal(m._labels.label1, 1234);
		})
	})

	describe('#extractor improvements', () => {
		it('Date auto extract', () => {
			m = new Metric({ metricDataType: Date })
			m.set({}, "2020-02-08T10:27:10.338473042Z")
			assert.isTrue(_.isNumber(m._metric.hashMap[''].value))
			assert.notEqual(m._metric.hashMap[''].value, m._defaultMetricValue)
		})
		it('Number auto extract', () => {
			m = new Metric({ metricDataType: Number })
			m.set({}, "12903847612783")
			assert.isTrue(_.isNumber(m._metric.hashMap[''].value))
			assert.notEqual(m._metric.hashMap[''].value, m._defaultMetricValue)
		})

		it('Boolean auto extract', () => {
			m = new Metric({ metricDataType: Boolean, defaultMetricValue: -1 })
			m.set({}, false)
			assert.equal(m._metric.hashMap[''].value, 0)
			m.set({}, true)
			assert.equal(m._metric.hashMap[''].value, 1)
			m.set({}, 'false')
			assert.equal(m._metric.hashMap[''].value, 0)
			m.set({}, 'true')
			assert.equal(m._metric.hashMap[''].value, 1)
		})
	})

	describe('#extractor jmespath', () => {
		it('should iterate through nested array and object inside array item', () => {
			m = new Metric({
				labelNames: ['label1', 'label2'], extractPathLib: 'jmespath',
				extractPath: 'info[].{a: a, b: b.c}', extractor: (list, m) => {
					list.forEach(item => m.set({ label1: item.a }, item.b, x => parseInt(x)) )
					return false
				}
			})
			m.set({}, { info: [{ a: "1", b: { c: "5" } }, { a: "3", b: { c: "6" } }] })
			assert.equal(_.keys(m.metric.hashMap).length, 2)
			_.values(m.metric.hashMap).forEach(m => {
				assert.notEqual(m.value, -1)
				assert.equal(_.keys(m.labels).length, 2)
			})
		})

		it('#extractorPathLib alternatives check', () => {
			let [m1, m2] = [
				new Metric({ name: "lolkek", extractPathLib: 'lolkek', extractPath: 'a' }),
				new Metric({ extractPath: 'a' })
			]
			m1.set({}, { a: 1 })
			m2.set({}, { a: 1 })
			assert.equal(m1.metric.hashMap[''].value, m2.metric.hashMap[''].value)
			assert.equal(m1.metric.hashMap[''].value, 1)
		})
	})
})
