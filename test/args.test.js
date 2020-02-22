const {	parseNrun, logger } = require('../lib')
const { assert, expect } = require('chai')
const _ = require('lodash')

describe('argv', () => {

	describe('extras', () => {

		it('should do something without cmd', () => {
			parseNrun('', (err, argv) => {
				assert.isDefined(err)
				assert.isDefined(err[0].message)
			})
		})

		// command = '--target.0.url http://1 --target.0.status --no-target.0.candidates --target.1.url http://2 --target.1.net-info --target.1.candidates'
		it(`super-duper array assignment`, () => {
			parseNrun('args --target http://1 --status --no-candidates --port 3000 --	--target http://2 --no-net-info --candidates --timeout 100 -- --target http://3 --no-status', (err, argv) => {
				assert.equal(argv.status.length, 3)
				assert.equal(argv.status[0], true)
				assert.equal(argv.status[1], true)
				assert.equal(argv.status[2], false)
				assert.equal(argv.netInfo.length, 3)
				assert.equal(argv.netInfo[0], true)
				assert.equal(argv.netInfo[1], false)
				assert.equal(argv.netInfo[2], true)
				assert.equal(argv.candidates.length, 3)
				assert.equal(argv.candidates[0], false)
				assert.equal(argv.candidates[1], true)
				assert.equal(argv.candidates[2], true)
			})
		})
		it('#serve command works same way as #args', () => {
			parseNrun('serve --target http://1 --status --no-candidates --port 3000 --	--target http://2 --no-net-info --candidates --timeout 100 -- --target http://3 --no-status', (err, argv) => {
				assert.equal(argv.status.length, 3)
				assert.equal(argv.status[0], true)
				assert.equal(argv.status[1], true)
				assert.equal(argv.status[2], false)
				assert.equal(argv.netInfo.length, 3)
				assert.equal(argv.netInfo[0], true)
				assert.equal(argv.netInfo[1], false)
				assert.equal(argv.netInfo[2], true)
				assert.equal(argv.candidates.length, 3)
				assert.equal(argv.candidates[0], false)
				assert.equal(argv.candidates[1], true)
				assert.equal(argv.candidates[2], true)
			})
		})
		it(`command produces proper #status array`, () => {
			parseNrun(`args --target http:// -- --target http:// --no-status`, (err, argv) => {
				// logger.error(argv)
				assert.equal(argv.status.length, 2)
				assert.equal(argv.status[0], true)
				assert.equal(argv.status[1], false)
			})
		})
		it(`command produces proper #status array`, () => {
			parseNrun(`args --target http:// --no-status -- --target http://`, (err, argv) => {
				// logger.error(argv)
				assert.equal(argv.status.length, 2)
				assert.equal(argv.status[0], false)
				assert.equal(argv.status[1], true)
			})
		})
	})

	describe('proper args parsing (two targets)', () => {
		it('should exists two targets', () => {
			parseNrun('args --target http://money --target http://lebowski', (err, argv) => {
				assert.equal(argv.target.length, 2)
			})
		})
		it('should exists two targets and --status + --no-status', () => {
			parseNrun('args --target http://money --status --target http://lebowski --no-status', (err, argv) => {
				assert.equal(argv.status.length, 2)
				assert.equal(argv.status[0], true)
				assert.equal(argv.status[1], false)
			})
		})
	})
	describe('proper args parsing (single target)', () => {
		it('default --status --net-info --candidates should be arrays of boolean', () => {
			parseNrun('args --target http://1234', (err, argv) => {
				assert.isNull(err)
				assert.isDefined(argv)
				assert.isArray(argv.target)
				assert.equal(argv.target[0], 'http://1234')
				assert.isArray(argv.status)
				assert.equal(argv.status[0], true)
				assert.isArray(argv.netInfo)
				assert.equal(argv.netInfo[0], true)
				assert.isArray(argv.candidates)
				assert.equal(argv.candidates[0], true)
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
