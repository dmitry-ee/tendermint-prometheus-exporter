const logger = require('./logger')
const { assignWith, compact, isArrayLikeObject, isUndefined, merge, flatten, isEmpty } = require('lodash')

let argvBuilder = (args) => {
	// logger.error(`ARGS BEFORE ...`)
	// logger.warn(args)
	// args.test = "LOL"
}

let _parser = require('yargs')
	// .middleware(argv => {
	// 	logger.warn(argv)
	// }, true)
	// .usage('Usage: node idex.js serve --target=http://... [--target=...] [--port=]')
	// .example('node index.js server --target=https://api.minter.one --port=3000 --target=http://api-01.minter.store:8841')
	// .command('mocha', 'autotests with mocha',
	// 	yargs => yargs
	// 		.demandOption('target'),
	// 	argv => argvBuilder(argv)
	// )
	// .parserConfiguration({ 'flatten-duplicate-arrays': false })
	.command('args', 'just print start command line arguments',
		yargs => yargs,
		argv => argvBuilder(argv)
	)
	.command('serve', 'start serving metrics',
		yargs => yargs,
		argv => argvBuilder(argv)
	)
	.option('target', 		{ type: 'array', desc: 'scrape url', })
	.option('status',     { type: 'array', desc: 'should scrape /status url', default: true })
	.option('net-info',   { type: 'array', desc: 'should scrape /net_info url', default: true })
	.option('candidates', { type: 'array', desc: 'should scrape /candidates url', default: true })
	.option('port', 			{	type: 'number',	desc: 'port to start at' })
	.option('timeout', 		{ type: 'number', desc: 'http timeout for requests (ms)' })
	.demandOption('target')
	// .help()

let buildTargets = argv => {
	
}

let parseNrun = (cmd="", callback) => {
	if (!cmd || cmd == "")
		cmd = process.argv.slice(0).join(' ')

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
	callback(finalErr, finalArgv, _parser)
}

module.exports.parseNrun = parseNrun
