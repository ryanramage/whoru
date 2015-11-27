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
  exports.build_tree(db, person_id, function (err, person) {
    if (err) return cb(err)
    if (!person) return cb()
    person.accounts.forEach(_account => {
      if (_account.app === app && _account.space === space && account) {
        multi_account_error = true
        account = _account  // just choose the last one
      }
      if (_account.app === app && _account.space === space && !account) account = _account
    })
    if (!account) return cb({ok: false, no_account: true, person: person})
    if (multi_account_error) return cb({ ok: false, multi_account: true}, account)

    account.person = person
    cb(null, account)
  })
}

exports.build_tree = function (db, person_id, cb) {
  var person
  var accounts = {}
  var logins = []

  allDetails(db, person_id, true).pipe(through.obj(function (data, enc, cb) {
    if (data.type !== 'account' && data.type !== 'person' && data.type !== 'login') return cb()
    if (data.type === 'person') {
      person = data
      person.accounts = []
      return cb()
    }
    if (data.type === 'account') {
      var account = data
      account._ids = idSplit(data)
      account.logins = []
      accounts[ account._ids.account_doc_uuid ] = account
    }
    if (data.type === 'login') {
      var login = data
      login._ids = idSplit(data)
      logins.push(login)
    }
    cb()
  }, function (done) {
    process.nextTick( () => {
      if (!person) return cb()
      // make christmas trees
      logins.forEach(login => {
        var account = accounts[ login._ids.account_doc_uuid ]
        if (!account) return
        account.logins.push(login)
      })
      Object.keys(accounts).forEach(account_num => {
        person.accounts.push(accounts[account_num])
      })
      cb(null, person)
    })
    done()
  }))
}



exports.by_id = function (db, person_id, cb) {
  db.get(person_id, cb)
}
