var fs = require('fs')
var mysql = require('mysql')
var _ = require('underscore')

// Configuration
require('dotenv').config()

var deviceId = process.argv[2]
var endTimestamp = (parseInt(process.argv[3]) || Math.round(Date.now() / 1000))
var range = (process.argv[4] || 24 * 60 * 60) // seconds
var interval = (parseInt(process.argv[5]) || 5 * 60) // seconds
var timestampStartByte = (parseInt(process.argv[6]) || 4) // bytes
var zeroCheckStartByte = (parseInt(process.argv[7]) || 14) // bytes
var startTimestamp = endTimestamp - range

var log = console.log.bind(console)

// Determine SPUL payloads
var lines = fs.readFileSync(process.env['LOG_FILE'], 'utf-8').split('\n').reverse()

var payloads = _.chain(lines)
	.map((line) => {
		try {
			if (line.indexOf(deviceId) < 0) return
			return JSON.parse(line)
		}
		catch (e) {}
	})
	.filter((data) => (
		data
		&& data.type === 'payload'
		&& data.deviceId === deviceId
	))
	.each((data) => {
		var ts = (new Buffer(data.msg.substr(timestampStartByte * 2, 8), 'hex')).readUInt32LE()
		data.timestamp = ts
		data.period = (ts - ts % interval)
	})
	.filter((data) => (
		data.timestamp >= startTimestamp
		&& data.timestamp <= endTimestamp
	))
	.value()

// Fetch storage records
var client = mysql.createConnection({
	host: process.env['MYSQL_HOST'],
	user: process.env['MYSQL_USER'],
	password: process.env['MYSQL_PASSWORD'],
	database: process.env['MYSQL_SENSOR_DATABASE'],
})
client.query(`
	SELECT UNIX_TIMESTAMP(timestamp) as ts FROM ??
	WHERE timestamp >= FROM_UNIXTIME(?)
	  AND timestamp <= FROM_UNIXTIME(?)
	ORDER BY timestamp DESC
`, [deviceId, startTimestamp, endTimestamp], (err, rows) => {
	if (err) return console.error(err)

	var records = _.map(rows, (row) => ({
		timestamp: row.ts,
		period: (row.ts - row.ts % interval),
	}))

	client.end()
	compare(payloads, records)
})

// Compare
function compare (payloads, records) {
	log('Device ID:          %s', deviceId)
	log('Verifying between:  %s', new Date((startTimestamp - startTimestamp % interval) * 1000))
	log('                    %s', new Date((endTimestamp   - endTimestamp   % interval) * 1000))
	log('Range:              %d seconds', range)
	log('Interval:           %d seconds', interval)
	log('Timestamp start:    after %d bytes', timestampStartByte)
	log('Zero check start:   after %d bytes (checks for uint16le)', zeroCheckStartByte)
	log('Payloads:           %d', payloads.length)
	log('Records:            %d', records.length)

	var ts = endTimestamp - (endTimestamp % interval)
	var missingPayloads = 0
	var missingRecords = 0
	var warnings = []
	var fixes = []
	var count = 0

	while (ts >= startTimestamp) {
		var payload = _.find(payloads, (payload) => payload.period === ts)
		var noPayload = ! payload
		var noRecord  = ! _.find(records, (record) => record.period === ts)

		// Ignore zero values, these are removed from the database
		if (payload && noRecord) {
			var check = (new Buffer(payload.msg.substr(zeroCheckStartByte * 2, 4), 'hex')).readUInt16LE()
			if (check === 0) noRecord = false
		}

		if (noPayload && noRecord) {
			warnings.push('No data for         ' + new Date(ts * 1000))
		} else {
			if (noPayload) warnings.push('Missing payload for ' + new Date(ts * 1000))
			if (noRecord)  warnings.push('Missing record for  ' + new Date(ts * 1000))
		}

		if (payload && noRecord) fixes.push(payload)

		if (noPayload) missingPayloads += 1
		if (noRecord)  missingRecords  += 1

		ts -= interval
		count += 1
	}

	var payloadLoss = Math.floor((missingPayloads / count) * 100 * 100) / 100
	var recordLoss  = Math.floor((missingRecords  / count) * 100 * 100) / 100

	log('Expected records:   %d', count)
	log('Missing payloads:   %d', missingPayloads)
	log('Missing records:    %d', missingRecords)
	log('Data loss:          %d %', payloadLoss)
	log('Record loss:        %d %', recordLoss)
	log('Fixes:              %d', fixes.length)
	log('')

	if (fixes.length > 0) {
		process.stderr.write(_.map(fixes, (payload) => payload.deviceId + ' ' + payload.msg).join('\n') + '\n')
		log('')
	}

	log(warnings.join('\n'))
}
