'use strict'

const { keys, isUndefined } = require('lodash')
const { logger, MetricServer, parseNrun } = require('./lib')

// const urls = [ 'https://api.minter.one', 'http://api-01.minter.store:8841']

parseNrun('', (argvParseErr, argv, parser) => {
	if (argvParseErr && argvParseErr[0]) {
		parser.showHelp()
	}
	if (argv._[0] == 'serve') {
		logger.warn(`starting with options ${JSON.stringify(argv)}`)
		let server = new MetricServer({ port: argv.port | 9675, timeout: argv.timeout | 100, targets: argv.targets })
		server.run()
	} else if (argv._[0] == 'args') {
		logger.warn(argv)
	}
})
