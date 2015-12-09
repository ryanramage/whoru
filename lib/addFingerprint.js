module.exports = function addFingerprint (db, fingerprint, deviceInfo, cb) {
  if (!db) return cb('a db is required')
  if (!fingerprint) return cb('A fingerprint is required')

  if (!cb && deviceInfo && typeof deviceInfo === 'function') {
    cb = deviceInfo
    deviceInfo = {}
  }
  // simple, add the fingerprint
  var doc = {
    _id: fingerprint,
    deviceInfo: deviceInfo
  }
  db.put(doc, function (err, resp) {
    if (err && err.status === 409) return cb()
    if (err) return cb(err)
    cb(null, resp)
  })
}
