'use strict'

const logger = require('./logger')
const { assignWith, compact, isArrayLikeObject, isUndefined, flatten, isEmpty, mapKeys } = require('lodash')

let argvBuilder = (args) => {
  // logger.error(`ARGS BEFORE ...`)
  // logger.warn(args)
  // args.test = "LOL"
}

let _parser = require('yargs')
  .command('args', 'just print start command line arguments',
    yargs => yargs,
    argv => argvBuilder(argv)
  )
  .command('serve', 'start serving metrics',
    yargs => yargs,
    argv => argvBuilder(argv)
  )
  .option('target',      { type: 'array',  desc: 'scrape url', alias:'t', })
  .option('status',      { type: 'array',  desc: 'should scrape /status url', default: false })
  .option('net-info',    { type: 'array',  desc: 'should scrape /net_info url', default: false })
  .option('candidates',  { type: 'array',  desc: 'should scrape /candidates url', default: false })
  .option('port',        { type: 'number', desc: 'port to start at' })
  .option('retention',   { type: 'number', desc: 'retention timeout (ms)' })
  .option('timeout',     { type: 'number', desc: 'http timeout for requests (ms)' })
  .boolean('status')
  .boolean('net-info')
  .boolean('candidates')
  .demandOption('target')

let buildScrapeTargets = argv => {
  if (!argv.target) throw new Error('#target is missing in argv!')
  if (!argv.status) throw new Error('#status is missing in argv!')
  if (!argv.netInfo) throw new Error('#net-info is missing in argv!')
  if (!argv.candidates) throw new Error('#candidates is missing in argv!')

  if (!isArrayLikeObject(argv.target)) throw new Error('#target is not an array!')
  if (!isArrayLikeObject(argv.status)) throw new Error('#status is not an array!')
  if (!isArrayLikeObject(argv.netInfo)) throw new Error('#net-info is not an array!')
  if (!isArrayLikeObject(argv.candidates)) throw new Error('#candidates is not an array!')

  if (argv.target.length != argv.status.length) throw new Error(`${argv.target} should be equal to ${argv.status}`)
  if (argv.target.length != argv.netInfo.length) throw new Error(`${argv.target} should be equal to ${argv.netInfo}`)
  if (argv.target.length != argv.candidates.length) throw new Error(`${argv.target} should be equal to ${argv.candidates}`)

  argv.targets = []
  argv.target.forEach((x, i) => {
    argv.targets.push({
      url: x,
      status: argv.status[i],
      'net-info': argv.netInfo[i],
      netInfo: argv.netInfo[i],
      candidates: argv.candidates[i]
    })
  })

  return argv
}

let parseNrun = (cmd = "", callback) => {
  if (!cmd || cmd == "")
    cmd = process.argv.slice(2).join(' ')

  var finalArgv = {}
  var finalErr = []

  cmd.split(/\s+--\s+/).forEach(cmd => {
    _parser.parse(cmd, (err, argv) => {
      assignWith(finalArgv, argv, (val, src) => {
        if (!isUndefined(val) && !isUndefined(src)) {
          return flatten([val, src])
        }
        if (isUndefined(val) && !isUndefined(src))
          return src
      })
      finalErr.push(err)
    })
  })
  finalErr = compact(finalErr)
  finalErr = isEmpty(finalErr) ? null : finalErr
  try {
    buildScrapeTargets(finalArgv)
    callback(finalErr, finalArgv, _parser)
  } catch (e) {
    callback([{ message: e, trace: e.trace }], finalArgv, _parser)
  }
}

module.exports.parseNrun = parseNrun
module.exports.buildScrapeTargets = buildScrapeTargets
