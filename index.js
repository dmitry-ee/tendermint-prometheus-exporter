'use strict'

const { keys, isUndefined } = require('lodash')
const { logger, MetricServer, parseNrun } = require('./lib')
const { version }  = require ('./package.json')

let showDisclaimer = () => {
	logger.log('disclaimer', '@@@@')
	logger.log('disclaimer', `Hello There!	This is Tendermint Prometheus Exporter v${version}`)
	logger.log('disclaimer', `Project:	 	https://github.com/dmitry-ee/tendermint-prometheus-exporter`)
	logger.log('disclaimer', `Donate:		BIP:Mx65bb9548ecde11e10cd823e365fd2fb0f4f03b25`)
	logger.log('disclaimer', '@@@@')
}

parseNrun('', (argvParseErr, argv, parser) => {
	if (argvParseErr && argvParseErr[0]) {
		parser.showHelp()
	}
	if (argv._[0] == 'serve') {
		showDisclaimer()
		logger.warn(`starting with options ${JSON.stringify(argv)}`)
		let server = new MetricServer({
			port: argv.port | 9675,
			timeout: argv.timeout | 1000,
			targets: argv.targets,
			metricsRetention: argv.retention | 3600000,
		})
		server.run()

		process.on('SIGINT', function() {
    	server.stop(process.exit)
		})

	} else if (argv._[0] == 'args') {
		logger.warn(argv)
	}
})
