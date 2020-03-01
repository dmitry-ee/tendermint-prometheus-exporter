'use strict'

const { keys, isUndefined } = require('lodash')
const { logger, MetricServer, parseNrun } = require('./lib')

let disclaimer = () => {
	logger.warn(`Hello There! This is Tendermint Prometheus Exporter v${process.env.EXPORTER_VERSION}`)
	logger.warn(`Project: https://github.com/dmitry-ee/tendermint-prometheus-exporter`)
	logger.warn(`Donate: BIP:Mx65bb9548ecde11e10cd823e365fd2fb0f4f03b25`)
}

parseNrun('', (argvParseErr, argv, parser) => {
	if (argvParseErr && argvParseErr[0]) {
		parser.showHelp()
	}
	if (argv._[0] == 'serve') {
		disclaimer()
		logger.warn(`starting with options ${JSON.stringify(argv)}`)
		let server = new MetricServer({ port: argv.port | 9675, timeout: argv.timeout | 1000, targets: argv.targets })
		server.run()

		process.on('SIGINT', function() {
    	server.stop()
			setTimeout(process.exit, 1000)
		})

	} else if (argv._[0] == 'args') {
		logger.warn(argv)
	}
})
