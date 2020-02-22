'use strict'

const { keys, isUndefined } = require('lodash')
const { logger, MetricServer, parseNrun } = require('./lib')

// const urls = [ 'https://api.minter.one', 'http://api-01.minter.store:8841']




//
// argv.parse('args serve --target 123', (err, argv, output) => {
// 	console.error(err)
// 	console.error(argv)
// 	console.error(output)
// })
//
// return

parseNrun('', (argvParseErr, argv, parser) => {
	parser.getCompletion(process.argv.slice(2), res => {
		console.log(res)
	})
	logger.error(argvParseErr)
	logger.warn(argv)
	if (argv._[0] == 'serve') {
		logger.warn(`starting with options ${JSON.stringify(argv)}`)
		let server = new MetricServer({ port: argv.port, timeout: argv.timeout, targets: argv.target })
		server.run()
	} else if (argv._[0] == 'args') {
		// logger.warn(argv)
	}

})
