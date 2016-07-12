const fs = require('fs')
const mysql = require('mysql')
const _ = require('underscore')
const parallel = require('node-parallel')
const stats = require('./stats')
const report = require('./report')
const bunyan = require('bunyan')

// Configuration
const config = require('../config.js')

// Prepare
const spulLines = fs.readFileSync(config.spulLogFile, 'utf-8').split('\n').reverse()
const client = mysql.createConnection(config.mysql)
const log = bunyan.createLogger({
	name: 'concava-perf',
	streams: [
		{ level: 'debug', path: config.logFile },
	]
})

// Determine stats
var p = parallel().timeout(config.timeout)

_.each(config.udids, (props, udid) => {
	p.add((done) => {
		stats(spulLines, client, udid, config.period, (err, result) => {
			if (err) return done(err)

			result.udid  = udid
			result.props = props

			done(null, result)
		})
	})
})

p.done((err, results) => {
	client.end()

	if (err) return log.error({ type: 'error' }, err)

	// Generate spreadsheet
	report(results, config.report, (err) => {
		if (err) return log.error({ type: 'error' }, err)

		log.info({ type: 'status', status: 'done' }, 'Done')
	})
})
