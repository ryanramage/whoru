var allDetails = require('./allDetails')
var idSplit = require('./id_split')
var through = require('through2')

exports.byFingerprint = function person (db, fingerprint, app, space, cb) {
  var login_fingerprint_docs = []
  allDetails(db, fingerprint).pipe(through.obj(function (data, enc, cb) {
    data._ids = idSplit(data)
    login_fingerprint_docs.push(data)
    cb()
  }, function (done) {
      process.nextTick(function () {
        if (!login_fingerprint_docs.length) return cb(null, null)
        var doc = login_fingerprint_docs[0]
        exports.find_account(db, doc._ids.person_doc_uuid, app, space, function (err, account) {
          if (err) return cb(err)
          cb(null, account.person)
        })
      })
      done()
    }
  ))
}

exports.byFingerprintAndLogin = function person (db, fingerprint, loginID, cb) {
  allDetails(db).pipe(through.obj(function (data, enc, cb) {

  }, function (cb) {

  }))
}

exports.find_account = function (db, person_id, app, space, cb) {
  var account
  var multi_account_error
  var people = {}

  allDetails(db, person_id, true).pipe(through.obj(function (data, enc, cb) {
    if (data.type !== 'account' && data.type !== 'person') return cb()
    if (data.type === 'person') {
      people[data._id] = data
      return cb()
    }
    if (data.app === app && data.space === space && account) {
      multi_account_error = true
      account = data  // just choose the last one
    }
    if (data.app === app && data.space === space && !account) account = data
    account._ids = idSplit(data)
    cb()
  }, function (done) {
    if (account) {
      account.person = people[account._ids.person_doc_uuid]
    }
    if (multi_account_error) return cb('there were multi accounts', account)
    cb(null, account)
  }))
}

exports.by_id = function (db, person_id, cb) {
  db.get(person_id, cb)
}
