var async = require('async')
var flatten = require('lodash.flatten')
var clone = require('lodash.cloneDeep')
var person = require('./person')
var allDetails = require('./allDetails')
var idSplit = require('./id_split')

exports.person = function (db, from_person_id, to_person_id, cb) {
  async.parallel({
    from: person.build_tree.bind(null, db, from_person_id),
    to: person.build_tree.bind(null, db, to_person_id),
    related: exports.findRelated.bind(null, db, from_person_id)
  }, function (err, data) {
    if (err) return cb(err)
    // lastly we need to get all the indexuserlogin docs based on the fingerprint/userloginID
    var accounts = {}
    data.from.accounts.forEach(_account => {
      _account.logins.forEach(_login => {
        accounts[_login._ids.userloginID ] = true
      })
    })
    async.map(Object.keys(accounts), function (_account, done) {
      var key = 'indexuserlogin/' + _account
      allDetails(db, key, function (err, resp) {
        if (err) return done(err)
        if (!resp.rows || !resp.rows.length) return done(null, [])
        var _data = resp.rows.map(function (row) { return row.doc })
        done(null, _data)
      })
    }, function (err, _accounts) {
      if (err) return cb(err)
      // lets build an array of inserts, with the replaced id
      var inserts = []
      var deletes = []
      var accounts_by_app_and_space = {}
      var login_cache = {}
      data.to.accounts.forEach(_account => {
        var app_and_space = [_account.app, _account.space].join('/')
        accounts_by_app_and_space[app_and_space] = _account
        _account.logins.forEach(_login => {
          login_cache[_login._id] = _login
        })
      })

      var from_replace = from_person_id
      var to_replace = to_person_id
      var accounts_to_replace = []

      data.from.accounts.forEach(_account => {
        var to_account_doc_uuid
        var __account = clone(_account)
        var app_and_space = [__account.app, __account.space].join('/')

        if (accounts_by_app_and_space[app_and_space]) {
          // we need to merge
          to_account_doc_uuid = accounts_by_app_and_space[app_and_space]._ids.account_doc_uuid
          accounts_to_replace.push({
            from: __account._ids.account_doc_uuid,
            to: to_account_doc_uuid
          })
        }
        __account.logins.forEach(_login => {
          delete _login._ids
          _login.prev_id = _login.prev_id || []
          _login.prev_id.push(_login._id)
          _login._id = _login._id.replace(from_replace, to_replace)
          _login.account_id = _login.account_id.replace(from_replace, to_replace)
          if (to_account_doc_uuid) {
            _login._id = _login._id.replace(_account._ids.account_doc_uuid, to_account_doc_uuid)
            _login.account_id = _login.account_id.replace(_account._ids.account_doc_uuid, to_account_doc_uuid)
          }
          // also check if there is an existing login with this new id
          if (login_cache[_login._id]) {
            console.log('we need to merge the login')
          }

          inserts.push(_login)
        })
        if (!to_account_doc_uuid) {
          // if there was no other account that matched, insert this one
          delete __account.logins
          delete __account._ids
          __account.prev_id = __account.prev_id || []
          __account.prev_id.push(__account._id)
          __account._id = __account._id.replace(from_replace, to_replace)
          inserts.push(__account)
        }
      })
      delete data.to.accounts
      data.to.prev_id = data.to.prev_id || []
      data.to.prev_id.push(data.from._id)
      inserts.push(data.to)
      deletes.push(data.from)

      flatten(_accounts).forEach(_indexuserlogin => {
        _indexuserlogin.prev_id = _indexuserlogin.prev_id || []
        _indexuserlogin.prev_id.push(_indexuserlogin._id)
        _indexuserlogin._id = _indexuserlogin._id.replace(from_replace, to_replace)
        // replace any of the existing account ids
        accounts_to_replace.forEach(_atr => {
          _indexuserlogin._id = _indexuserlogin._id.replace(_atr.from, _atr.to)
        })
        inserts.push(_indexuserlogin)
      })

      flatten(data.related.indexpersonfingerprints).forEach(_indexpersonfingerprints => {
        _indexpersonfingerprints.prev_id = _indexpersonfingerprints.prev_id || []
        _indexpersonfingerprints.prev_id.push(_indexpersonfingerprints._id)
        _indexpersonfingerprints._id = _indexpersonfingerprints._id.replace(from_replace, to_replace)
        // replace any of the existing account ids
        accounts_to_replace.forEach(_atr => {
          _indexpersonfingerprints._id = _indexpersonfingerprints._id.replace(_atr.from, _atr.to)
        })
        inserts.push(_indexpersonfingerprints)
      })

      flatten(data.related.loginfingerprints).forEach(_loginfingerprints => {
        _loginfingerprints.prev_id = _loginfingerprints.prev_id || []
        _loginfingerprints.prev_id.push(_loginfingerprints._id)
        _loginfingerprints._id = _loginfingerprints._id.replace(from_replace, to_replace)
        // replace any of the existing account ids
        accounts_to_replace.forEach(_atr => {
          _loginfingerprints._id = _loginfingerprints._id.replace(_atr.from, _atr.to)
        })
        inserts.push(_loginfingerprints)
      })

      async.each(inserts, function (_insert, done) {
        var _rev = _insert._rev
        if (_insert.type !== 'person') delete _insert._rev
        db.put(_insert, function (err) {
          if (err) return done(err)
          // delete the last prev id
          if (_insert.type === 'person') return done()
          var prev_id = _insert.prev_id[_insert.prev_id.length - 1]
          db.remove(prev_id, _rev, done)
        })
      }, function (err) {
        if (err) return cb(err)

        async.each(deletes, function (_delete, done) {
          db.remove(_delete, done)
        }, cb)

      })
    })
  })
}

exports.findRelated = function (db, from_person_id, cb) {
  var key = 'indexpersonfingerprint/' + from_person_id
  allDetails(db, key, function (err, resp) {
    if (err) return cb(err)
    var results = {
      indexpersonfingerprints: [],
      loginfingerprints: []
    }
    if (!resp.rows || !resp.rows.length) return cb(null, results)

    results.indexpersonfingerprints = resp.rows.map(function (row) {
      return row.doc
    })
    var from_person_fingerprints = results.indexpersonfingerprints.map(index_person_to_fingerprint_doc => {
      return idSplit(index_person_to_fingerprint_doc).fingerprint
    })
    async.map(from_person_fingerprints, function (from_person_fingerprint, done) {
      allDetails(db, from_person_fingerprint, function (err, resp) {
        if (err) return done(err)
        if (!resp.row || !resp.rows.length) return done(null, [])
        var loginfingerprints = resp.rows.map(function (row) { return row.doc })
        done(null, loginfingerprints)
      })
    }, function (err, loginfingerprints) {
      results.loginfingerprints = loginfingerprints
      cb(err, results)
    })
  })
}
