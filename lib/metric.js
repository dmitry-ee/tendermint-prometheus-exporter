'use strict'

const {
	assign, keys, values, isString, isArray, isDefined,
	isObjectLike, uniq, isUndefined, isObject, isInteger,
	isBoolean, first, at, isTrue, isNaN, clone
} = require('lodash')
const logger = require('./logger')
const Prometheus = require('prom-client')
const jmespath = require('jmespath')

class Metric {

	// TODO: add forEach implementation

	constructor(options = {}) {

		keys(options).forEach((k) => {
			options[`_${k}`] = options[k]
			delete options[k]
		})

		assign(this, {
			_prefix: 'undefined',
			_name: '',
			_help: 'Undefined',
			_labelNames: [],
			_addDate: false,
			_extractPath: '',
			_extractPathLib: 'lodash',
			_extractor: function(value) { return value },
			_labels: {},
			_initPrometheusMetric: false,
			_defaultMetricValue: -1,
			_defaultLabelValue: '',
			_metricDataType: undefined
		}, options)

		this._syncLabels()

		this._name = `${this._prefix}_${this._name}`

		if (this._metricDataType === Date)
			this._extractor = (v) => new Date(v).getTime()
		else if (this._metricDataType === Boolean)
			this._extractor = (v) => (v.toString() == 'true') ? 1 : 0
		else if (this._metricDataType === Number)
			this._extractor = (v) => parseInt(v)
	}

	init() {
		logger.debug(`#init on Metric[name=${this._name}]`)
		this._metric = new Prometheus.Gauge({
			name: this._name,
			help: this._help,
			labelNames: this._labelNames
		})
		this._initPrometheusMetric = true
	}

	release() {
		Prometheus.register.removeSingleMetric(this._metric.name)
		this._initPrometheusMetric = false
	}

	get name() {
		return this._name
	}

	get metric() {
		return this._metric
	}

	setLabels(newLabels = {}) {
		logger.debug(`Metric[name=${this._name}]#setLabels(${JSON.stringify(newLabels)})`)
		// TODO: fails, if metric has already init otherwise check & merge labels+labelNames
		if (this._initPrometheusMetric) {
			logger.info(`trying to modify labels with ${JSON.stringify(newLabels)}, _labels=${JSON.stringify(this._labels)} on already initialized metric [metricName=${this._name}]`)

			keys(this._labels).forEach(k => {
				if (newLabels[k])
					this._labels[k] = newLabels[k]
			})
		} else
			this._labels = assign({}, clone(this._labels), newLabels)

		this._syncLabels()
		return true
	}

	set(additionalLabels = {}, extractObject, currentExtractor) {
		if (!this._initPrometheusMetric && isUndefined(this._metric))
			this.init()

		var labelValues = assign(clone(this._labels), additionalLabels)
		//NOTE: save existing labels
		// logger.debug(`#set{${JSON.stringify(additionalLabels)}}`)
		// keys(additionalLabels).forEach(k => {
		// 	if (!isUndefined(this._labels[k]))
		// 		this._labels[k] = additionalLabels[k]
		// })
		// logger.debug(`extracting labelValues ->`)
		// logger.debug(this._labels)

		if (isUndefined(extractObject)) {
			logger.warn(`extractObject is undefined! [metricName=${this._name}]`)
			metricValue = this._defaultMetricValue
		} else {

			if (isUndefined(currentExtractor))
				currentExtractor = this._extractor

			logger.debug(`extracting ${this._extractPath} from ${(extractObject)}`)
			//logger.debug(first(at(extractObject, [this._extractPath])))

			let foundDataByPath
			if (isObjectLike(extractObject)) {
				logger.debug(`${extractObject} is like object...`)
				if (this._extractPathLib == 'jmespath') {
					foundDataByPath = jmespath.search(extractObject, this._extractPath)
					logger.debug(`using JMESPATH, found ${foundDataByPath}`)
				} else if (this._extractPathLib == 'lodash') {
					logger.debug(`using extractLib = ${this._extractPathLib}`)
					foundDataByPath = first(at(extractObject, [this._extractPath]))
				} else {
					foundDataByPath = first(at(extractObject, [this._extractPath]))
				}
			} else {
				logger.debug(`${extractObject} is not an object, skipping extraction...`)
				foundDataByPath = extractObject
			}

			var metricValue = currentExtractor(
				isObject(extractObject) ? foundDataByPath : extractObject, this, labelValues
			)
			// logger.debug(metricValue)
			// console.debug(`extracting metric ${metricValue}`)

			if (isBoolean(metricValue) && !metricValue && this._metricDataType !== Boolean) {
				logger.info(`value '${metricValue}' for [metricName=${this._name}] == false! Ignoring...`)
				return false
			}
			if (isNaN(metricValue)) {
				logger.info(`value '${metricValue}' for [metricName=${this._name}] == NaN! Ignoring...`)
				return false
			}
			if (!isInteger(metricValue)) {
				logger.warn(`value '${metricValue}' for [metricName=${this._name}] should be Integer! Applying [defaultMetricValue=${this._defaultMetricValue}]`)
				metricValue = this._defaultMetricValue
			}
		}

		try {
			if (this._addDate)
				this._metric.set(labelValues, metricValue, Date.now())
			else
				this._metric.set(labelValues, metricValue)
		} catch (e) {
			logger.error(e)
		}
	}

	_syncLabels() {
		logger.debug(`Metric#_syncLabels[BEFORE:labels=${JSON.stringify(this._labels)},labelNames=${this._labelNames}]`)
		if (!isObjectLike(this._labels)
			|| isArray(this._labels)
		)	throw new Error(`labels sould be object, got ${this._labels}`)

		// NOTE: init labelNames with labels {}
		if (this._labelNames.length == 0
			&& keys(this._labels).length !== 0
		) this._labelNames = keys(this._labels)

		// NOTE: init labels {} with labelNames + _defaultLabelValue
		if (this._labelNames.length !== 0
			&& keys(this._labels).length == 0
		) this._labelNames.forEach((l) => { this._labels[l] = this._defaultLabelValue })

		// NOTE: combine labels {} & labelNames + fill unknown labels with _defaultLabelValue
		uniq(this._labelNames.concat(keys(this._labels))).forEach((k) => {
			// console.debug(k)
			if (keys(this._labels).indexOf(k) === -1)
				this._labels[k] = this._defaultLabelValue
			if (this._labelNames.indexOf(k) === -1)
				this._labelNames.push(k)
		})

		logger.debug(`Metric#_syncLabels[AFTER:labels=${JSON.stringify(this._labels)},labelNames=${this._labelNames}]`)
	}
}

module.exports = Metric
