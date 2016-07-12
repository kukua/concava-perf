const GoogleSpreadsheet = require('google-spreadsheet')
const series = require('run-series')
const _ = require('underscore')
const dateFormat = require('dateformat')

const percentage = (val) => Math.round(val * 100 * 100) / 100

module.exports = (results, config, cb) => {
	var doc = new GoogleSpreadsheet(config.key)
	var title = dateFormat(new Date(), config.titleFormat)

	const format = {
		'UDID': (result) => result.udid,
		'Friendly Name': (result) => result.props.name,
		'Payload Count': (result) => result.periods - result.missingPayloads.length,
		'Record Count': (result) => result.periods - result.missingRecords.length,
		'Expected Count': (result) => result.periods,
		'Payload Loss': (result) => percentage(result.payloadLoss),
		'Record Loss': (result) => percentage(result.recordLoss),
		'Fixes': (result) => result.fixes.length,
	}

	doc.useServiceAccountAuth(config.creds, () => {
		doc.addWorksheet({
			title: title,
			rowCount: 1,
			colCount: _.size(format),
			headers: Object.keys(format),
		}, (err, sheet) => {
			if (err) return cb(err)

			// Like parallel but sequential
			series(_.map(results, (result) => {
				return (done) => {
					var row = {}
					_.each(Object.keys(format), (key) => {
						row[key] = format[key](result)
					})
					sheet.addRow(row, done)
				}
			}), cb)
		})
	})
}
