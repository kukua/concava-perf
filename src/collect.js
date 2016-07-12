const fs = require('fs')
const mysql = require('mysql')
const _ = require('underscore')
const parallel = require('node-parallel')
const stats = require('./stats')
const report = require('./report')

// Configuration
const config = require('../config.js')

// Prepare
const spulLines = fs.readFileSync(config.spulLogFile, 'utf-8').split('\n').reverse()
const client = mysql.createConnection(config.mysql)

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

	if (err) return console.error(err)

	// Generate spreadsheet
	report(results)
})
