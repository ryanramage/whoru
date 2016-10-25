var allDetails = require('./allDetails')
var idSplit = require('./id_split')

exports.byFingerprint = function (db, fingerprint, app, space, cb) {

  allDetails(db, fingerprint, function (err, resp) {
    if (err) return cb(err)
    if (!resp.rows || !resp.rows.length) return cb()

    var login_fingerprint_docs = resp.rows.map(function (row) {
      var doc = row.doc
      doc._ids = idSplit(doc)
      return doc
    })

    var doc = login_fingerprint_docs[0]
    exports.find_account(db, doc._ids.person_doc_uuid, app, space, function (err, account) {
      if (err) return cb(err)

      var selector = exports.selectPath(account.person, app, space)
      cb(null, selector.person)
    })
  })
}

exports.find_account = function (db, person_id, app, space, cb) {
  var account
  var multi_account_error
  exports.build_tree(db, person_id, function (err, person) {
    if (err) return cb(err)
    if (!person) return cb()
    person.accounts.forEach(function (_account) {
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

  allDetails(db, person_id, true, function (err, resp) {
    if (err) return cb(err)
    if (!resp.rows || !resp.rows.length) return cb()
    resp.rows.forEach(function (row) {
      var data = row.doc
      if (data.type === 'person') {
        person = data
        person.accounts = []
        return
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
    })
    if (!person) return cb()
    // make christmas trees
    logins.forEach(function (login) {
      var account = accounts[ login._ids.account_doc_uuid ]
      if (!account) return
      account.logins.push(login)
    })
    Object.keys(accounts).forEach(function (account_num) {
      person.accounts.push(accounts[account_num])
    })
    cb(null, person)
  })
}

exports.by_id = function (db, person_id, cb) {
  db.get(person_id, cb)
}

exports.selectPath = function (_person, app, space, userloginID, loginType) {
  var results = {
    person: null,
    selected_account: null,
    selected_login: null
  }
  if (!_person) return results

  _person.accounts = _person.accounts.map(function (_account) {
    if (_account.space !== space || _account.app !== app) return _account
    _account.selected = true
    results.selected_account = _account
    if (!userloginID || !loginType) return _account

    _account.logins.forEach(function (_login) {
      _login._ids = idSplit(_login)
      if (_login.loginType === loginType && _login._ids.userloginID === userloginID) {
        _login.selected = true
        results.selected_login = _login
      }
    })

    return _account
  })

  results.person = _person
  return results
}

exports.by_userLoginID = function (db, userLoginID, cb) {

  var prefixed_id = 'indexuserlogin/' + userLoginID
  allDetails(db, prefixed_id, function (err, resp) {
    if (err) return cb(err)
    if (!resp.rows || !resp.rows.length) return cb()
    var allLogins = resp.rows.map(function (row) {
      return idSplit(row.doc)
    })
    cb(null, allLogins)
  })
}
