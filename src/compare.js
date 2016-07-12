const _ = require('underscore')

// Compare
module.exports = (udid, config, payloads, records, cb) => {
	var ts = config.endTimestamp - (config.endTimestamp % config.interval)
	var result = {
		missingData: [],
		missingPayloads: [],
		missingRecords: [],
		fixes: [],
		periods: 0,
	}

	while (ts >= config.startTimestamp) {
		var payload   = _.find(payloads, (payload) => payload.period === ts)
		var noPayload = ! payload
		var noRecord  = ! _.find(records, (record) => record.period === ts)
		var date      = new Date(ts * 1000)

		// Ignore zero values, these are removed from the database
		if (payload && noRecord) {
			var check = (new Buffer(payload.msg.substr(config.zeroCheckStartByte * 2, 4), 'hex')).readUInt16LE()
			if (check === 0) noRecord = false
		}

		if (noPayload && noRecord) {
			result.missingData.push(date)
		}
		if (noPayload) {
			result.missingPayloads.push(date)
		}
		if (noRecord) {
			result.missingRecords.push(date)
		}
		if (payload && noRecord) {
			payload.date = date
			result.fixes.push(payload)
		}

		ts -= config.interval
		result.periods += 1
	}

	result.dataLoss    = (result.missingData.length     / result.periods)
	result.payloadLoss = (result.missingPayloads.length / result.periods)
	result.recordLoss  = (result.missingRecords.length  / result.periods)

	cb(null, result)
}
