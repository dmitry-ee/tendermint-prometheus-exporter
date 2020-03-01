'use strict'

const { createLogger, format, transports } = require('winston');
const { isObjectLike } = require('lodash')
const path = require('path')
const util = require('util')

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'warn',
  format: format.combine(
    format.label({ label: path.basename(process.mainModule.filename) }),
    format.colorize(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    format.printf(
      info => {
        info.message = isObjectLike(info.message) ? util.inspect(info.message, {depth: null}) : info.message
        return `${info.timestamp} ${info.level} [${info.label}]: ${info.message}`
      }
    )
  ),
  transports: [
    new transports.Console(),
  ]
})

module.exports = logger
