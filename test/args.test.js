const {	parseNrun, buildScrapeTargets, logger } = require('../lib')
const { assert, expect } = require('chai')
const _ = require('lodash')

describe('argv', () => {

	describe('#buildScrapeTargets', () => {
		it('should throw errors upon argv validation', () => {
			expect(() => buildScrapeTargets({})).throw()
			// #target, #status, #netInfo, #candidates should be defined
			expect(() => buildScrapeTargets({ target: undefined })).throw()
			expect(() => buildScrapeTargets({ target: '', status: undefined })).throw()
			expect(() => buildScrapeTargets({ target: '', status: '', netInfo: undefined, candidates: undefined })).throw()
			expect(() => buildScrapeTargets({ target: '', status: '', netInfo: '', candidates: undefined })).throw()
			expect(() => buildScrapeTargets({ target: '', status: '', netInfo: '', candidates: '' })).throw()
			// #target, #status, #netInfo, #candidates should be an array
			expect(() => buildScrapeTargets({ target: 1, status: 1, netInfo: 1, candidates: 1 })).throw()
			expect(() => buildScrapeTargets({ target: [], status: 1, netInfo: 1, candidates: 1 })).throw()
			expect(() => buildScrapeTargets({ target: [], status: [], netInfo: 1, candidates: 1 })).throw()
			expect(() => buildScrapeTargets({ target: [], status: [], netInfo: [], candidates: 1 })).throw()
			expect(() => buildScrapeTargets({ target: [], status: [], netInfo: [], candidates: [] })).not.throw()
			// #target, #status, #netInfo, #candidates should have the same length
			expect(() => buildScrapeTargets({ target: [1], status: [], netInfo: [], candidates: [] })).throw()
			expect(() => buildScrapeTargets({ target: [], status: [1], netInfo: [], candidates: [] })).throw()
			expect(() => buildScrapeTargets({ target: [], status: [], netInfo: [1], candidates: [] })).throw()
			expect(() => buildScrapeTargets({ target: [], status: [], netInfo: [], candidates: [1] })).throw()
		})

		it('should proper build #targets', () => {
			argv = buildScrapeTargets({ target: ['abc'], status:[true], netInfo: [false], 'net-info': [false], candidates: [false] })
			assert.isDefined(argv.targets[0])
			assert.equal(argv.targets[0].url, 'abc')
			assert.equal(argv.targets[0].status, true)
			assert.equal(argv.targets[0].netInfo, false)
			assert.equal(argv.targets[0]['net-info'], false)
			assert.equal(argv.targets[0].candidates, false)
		})
	})

	describe('extras', () => {

		it('should do something without cmd', () => {
			parseNrun('', (err, argv) => {
				// logger.error(err)
				// logger.error(argv)
				assert.isDefined(err)
				assert.isDefined(err[0].message)
			})
		})

		it(`super-duper array assignment`, () => {
			parseNrun('args --target http://1 --status --no-candidates --port 3000 --	--target http://2 --net-info --candidates --timeout 100 -- --target http://3 --no-status', (err, argv) => {
				assert.equal(argv.status.length, 3)
				assert.equal(argv.status[0], true)
				assert.equal(argv.status[1], false)
				assert.equal(argv.status[2], false)
				assert.equal(argv.netInfo.length, 3)
				assert.equal(argv.netInfo[0], false)
				assert.equal(argv.netInfo[1], true)
				assert.equal(argv.netInfo[2], false)
				assert.equal(argv.candidates.length, 3)
				assert.equal(argv.candidates[0], false)
				assert.equal(argv.candidates[1], true)
				assert.equal(argv.candidates[2], false)
			})
		})
		it('#serve command works same way as #args', () => {
			parseNrun('serve --target http://1 --status --no-candidates --port 3000 --	--target http://2 --net-info --candidates --timeout 100 -- --target http://3 --no-status', (err, argv) => {
				assert.equal(argv.status.length, 3)
				assert.equal(argv.status[0], true)
				assert.equal(argv.status[1], false)
				assert.equal(argv.status[2], false)
				assert.equal(argv.netInfo.length, 3)
				assert.equal(argv.netInfo[0], false)
				assert.equal(argv.netInfo[1], true)
				assert.equal(argv.netInfo[2], false)
				assert.equal(argv.candidates.length, 3)
				assert.equal(argv.candidates[0], false)
				assert.equal(argv.candidates[1], true)
				assert.equal(argv.candidates[2], false)
			})
		})
		it(`command produces proper #status array (first)`, () => {
			parseNrun(`args --target http:// -- --target http:// --status`, (err, argv) => {
				// logger.error(argv)
				assert.equal(argv.status.length, 2)
				assert.equal(argv.status[0], false)
				assert.equal(argv.status[1], true)
			})
		})
		it(`command produces proper #status array (second)`, () => {
			parseNrun(`args --target http:// --status -- --target http://`, (err, argv) => {
				// logger.error(argv)
				assert.equal(argv.status.length, 2)
				assert.equal(argv.status[0], true)
				assert.equal(argv.status[1], false)
			})
		})
	})

	describe('proper args parsing (two targets)', () => {
		it('should exists two targets', () => {
			parseNrun('args --target http://money -- --target http://lebowski', (err, argv) => {
				assert.equal(argv.target.length, 2)
			})
		})
		it('should exists two targets and --status + --no-status', () => {
			parseNrun('args --target http://money --status -- --target http://lebowski --no-status', (err, argv) => {
				assert.equal(argv.status.length, 2)
				assert.equal(argv.status[0], true)
				assert.equal(argv.status[1], false)
			})
		})
	})
	describe('proper args parsing (single target)', () => {
		it('values #status #net-info #candidates should be arrays of boolean', () => {
			parseNrun('args --target http://1234', (err, argv) => {
				assert.isNull(err)
				assert.isDefined(argv)
				assert.isArray(argv.target)
				assert.equal(argv.target[0], 'http://1234')
				assert.isArray(argv.status)
				assert.equal(argv.status[0], false)
				assert.isArray(argv.netInfo)
				assert.equal(argv.netInfo[0], false)
				assert.isArray(argv.candidates)
				assert.equal(argv.candidates[0], false)
			})
		})
		it('all necessary fields are exists with proper type', () => {
			parseNrun('args --target http://blahblah --status --net-info --candidates', (err, argv) => {
				assert.isNull(err)
				assert.isDefined(argv)
				assert.isArray(argv.target)
				assert.equal(argv.target[0], 'http://blahblah')
				assert.isArray(argv.status)
				assert.equal(argv.status[0], true)
				assert.isArray(argv.netInfo)
				assert.equal(argv.netInfo[0], true)
				assert.isArray(argv.candidates)
				assert.equal(argv.candidates[0], true)
			})
		})
		it('all necessary fields are exists with proper type with --no', () => {
			parseNrun('args --target http://blahblah --no-status --no-net-info --no-candidates', (err, argv) => {
				assert.isNull(err)
				assert.isDefined(argv)
				assert.isArray(argv.target)
				assert.equal(argv.target[0], 'http://blahblah')
				assert.isArray(argv.status)
				assert.equal(argv.status[0], false)
				assert.isArray(argv.netInfo)
				assert.equal(argv.netInfo[0], false)
				assert.isArray(argv.candidates)
				assert.equal(argv.candidates[0], false)
			})
		})
	})
})
