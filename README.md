# Verify measurements

## Usage

```bash
cp .env.example .env
chmod 600 .env
# > Edit .env

npm start <device ID> <end timestamp> <range> <interval> <timestamp start> <zero check start>

// Arguments:
//   device ID          Hexadecimal device ID (lowercase).
//   end timestamp      [optional] UNIX timestamp till end point. Default: current
//   range              [optional] Seconds to determine start timestamp. Default: 86400 (24 hours)
//   interval           [optional] Measurement interval. Default: 300 (5 minutes)
//   timestamp start    [optional] Start byte of timestamp. Default: 4
//   zero check start   [optional] Start byte of zero check. Default: 14 (humidity)

// Example (last 90 days):
npm start 5131fc0f120241ae '' 7776000
```
