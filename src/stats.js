const _ = require('underscore')
const compare = require('./compare')

module.exports = (spulLines, client, udid, config, cb) => {
	// Determine SPUL payloads
	var payloads = _.chain(spulLines)
		.map((line) => {
			try {
				if (line.indexOf(udid) < 0) return
				return JSON.parse(line)
			}
			catch (e) {}
		})
		.filter((data) => (
			   data
			&& data.type === 'payload'
			&& data.deviceId === udid
		))
		.each((data) => {
			var ts = (new Buffer(data.msg.substr(config.timestampStartByte * 2, 8), 'hex')).readUInt32LE()
			data.timestamp = ts
			data.period = (ts - ts % config.interval)
		})
		.filter((data) => (
			   data.timestamp >= config.startTimestamp
			&& data.timestamp <= config.endTimestamp
		))
		.value()

	// Fetch storage records
	client.query(`
		SELECT UNIX_TIMESTAMP(timestamp) as ts FROM ??
		WHERE timestamp >= FROM_UNIXTIME(?)
	  	  AND timestamp <= FROM_UNIXTIME(?)
		ORDER BY timestamp DESC
	`, [udid, config.startTimestamp, config.endTimestamp], (err, rows) => {
		if (err) return cb(err)

		var records = _.map(rows, (row) => ({
			timestamp: row.ts,
			period: (row.ts - row.ts % config.interval),
		}))

		compare(udid, config, payloads, records, cb)
	})
}
