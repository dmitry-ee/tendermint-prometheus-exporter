'use strict'

const { keys, isUndefined } = require('lodash')
const { logger, MetricServer } = require('./lib')


// const urls = [ 'https://api.minter.one', 'http://api-01.minter.store:8841']

const argv = require('yargs')
	// .usage('Usage: node idex.js serve --target=http://... [--target=...] [--port=]')
	// .example('node index.js server --target=https://api.minter.one --port=3000 --target=http://api-01.minter.store:8841')
	.command('serve', 'start serving metrics')
	.option('port', {
		describe: 'port to start at',
		type: 'number',
		default: 9675
	})
	.option('target', {
		type: 'array'
	})
	.option('timeout', {
		describe: 'http timeout for requests (ms)',
		type: 'number',
		default: 100
	})
	.demandOption(['target'])
	.argv

let buildTargets = () => {
}

logger.warn(argv)
if (argv._[0] == 'serve') {
	logger.warn(`starting with options ${JSON.stringify(argv)}`)
	let server = new MetricServer({ port: argv.port, timeout: argv.timeout, targets: argv.target })
	server.run()
}
