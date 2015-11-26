module.exports = function addFingerprint (db, fingerprint, deviceInfo, cb) {
  if (!db) return cb('a db is required')
  if (!fingerprint) return cb('A fingerprint is required')

  if (!cb && deviceInfo && typeof deviceInfo === 'function') {
    cb = deviceInfo
    deviceInfo = {}
  }
  // simple, add the fingerprint
  db.put(fingerprint, deviceInfo, cb)
}
