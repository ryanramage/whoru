var addFingerprint = require('./addFingerprint')
var login = require('./login')
var person = require('./person')
var allDetails = require('./allDetails')

module.exports = function (db) {
  return {
    // yes I could bind all these, but for people using the api, this is easier to follow
    addFingerprint: function (fingerprint, deviceInfo, cb) {
      return addFingerprint(db, fingerprint, deviceInfo, cb)
    },
    addLogin: function (fingerprint, userloginID, loginType, app, space, details, cb) {
      return login(db, fingerprint, userloginID, loginType, app, space, details, cb)
    },
    findPerson: function (fingerprint, app, space, cb) {
      return person.byFingerprint(db, fingerprint, app, space, cb)
    },
    findDetails: function (fingerprint) {
      return allDetails(db, fingerprint)
    }
  }
}
