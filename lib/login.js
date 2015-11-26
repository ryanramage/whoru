var person = require('./person')
var async = require('async')
var squuid = require('squuid')

module.exports = function login (db, fingerprint, userloginID, loginType, app, space, details, cb) {
  // check if we have any deails
  person.byFingerprint(db, fingerprint, app, space, function (err, people) {
    if (err) return cb(err)
    if (!people) return firstTimer(db, fingerprint, userloginID, loginType, app, space, details, cb)
  })
}

function firstTimer (db, fingerprint, userloginID, loginType, app, space, details, cb) {

  var person_doc_uuid = squuid()
  var account_doc_uuid = squuid()

  var person_doc = {
    _id: person_doc_uuid,
    type: 'person'
  }
  var account_doc = {
    _id: [person_doc_uuid, account_doc_uuid].join('/'),
    space: space,
    app: app,
    type: 'account'
  }
  var login_doc = {
    _id: [person_doc_uuid, account_doc_uuid, userloginID].join('/'),
    account_id: account_doc._id,
    loginType: loginType,
    details: details,
    type: 'login'
  }
  var login_fingerprint_doc = {
    _id: [fingerprint, person_doc_uuid, account_doc_uuid, userloginID].join('/'),
    type: 'loginfingerprint'
  }

  async.waterfall([
    db.put.bind(db, person_doc._id, person_doc),
    db.put.bind(db, account_doc._id, account_doc),
    db.put.bind(db, login_doc._id, login_doc),
    db.put.bind(db, login_fingerprint_doc._id, login_fingerprint_doc)
  ], function (err) {
    if (err) return cb(err)
    return cb(null, person_doc)
  })

}
