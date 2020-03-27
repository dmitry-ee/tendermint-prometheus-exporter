'use strict'

const { assign, keys, values,  isString, isArray, isUndefined, isObjectLike, map, compact, clone } = require('lodash')
const Metric = require('./metric')
const logger = require('./logger')

class MetricSet {

  // TODO: add forEach implementation

  constructor(options = {}) {

    keys(options).forEach((k) => {
      options[`_${k}`] = options[k]
      delete options[k]
    })

    assign(this, {
      _prefix: 'undefined',
      _labels: {},
      _metricSet: {}
    }, options)
  }

  forEach(callback) {
    values(this._metricSet).forEach(metric => {
      if (isArray(metric))
        metric.forEach(x => callback(x))
    })
  }

  get metrics() {
    let metrics = []
    this.forEach(m => metrics.push(m.metric))
    return compact(metrics)
  }

  add(context, options = {}) {
    if (!isString(context))
      throw new Error(`#add context must be string, got = '${context}'`)
    if (!this._metricSet[context])
      this._metricSet[context] = []

    let newOptions = assign(options, { labels: clone(this._labels), prefix: `${this._prefix}_${context}` })
    logger.debug(`add [context=${context}, options=${JSON.stringify(newOptions)}}`)
    this._metricSet[context].push(new Metric(newOptions))
    return true
  }

  setLabels(labels = {}) {
    let newLabels = assign({}, this._labels, labels)
    this._labels = newLabels
    logger.debug(`#setLabels -> ${JSON.stringify(newLabels)}`)
    values(this._metricSet).forEach(metric => {
      if (isArray(metric))
        metric.forEach(x => {
          x.setLabels(newLabels)
        })
    })
  }

  set(context, additionalLabels = {}, value = {}) {
    if (!isString(context))
      throw new Error(`#add context must be string, got = '${context}'`)

    let metrics = this._metricSet[context]
    if (isUndefined(metrics))
      return false

    logger.debug(`MetricSet#set(${context}, ${additionalLabels})`)
    //logger.warn(value)

    metrics.forEach(m => m.set(additionalLabels, value))
  }
}

module.exports = MetricSet
