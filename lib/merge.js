var async = require('async')
var concat = require('concat-stream')
var flatten = require('lodash.flatten')
var clone = require('lodash.cloneDeep')
var person = require('./person')
var allDetails = require('./allDetails')
var idSplit = require('./id_split')

exports.person = function (db, from_person_id, to_person_id, cb) {
  async.parallel({
    from: person.build_tree.bind(null, db, from_person_id),
    related: exports.findRelated.bind(null, db, from_person_id)
  }, function (err, data) {
    // lastly we need to get all the indexuserlogin docs based on the fingerprint/userloginID
    var accounts = {}
    data.from.accounts.forEach(_account => {
      _account.logins.forEach(_login => {
        accounts[_login._ids.userloginID ] = true
      })
    })
    async.map(Object.keys(accounts), function (_account, done) {
      var key = 'indexuserlogin/' + _account
      allDetails(db, key).pipe(concat(function (_data) {
        done(null, _data)
      }))
    }, function (err, _accounts) {

      // lets build an array of inserts, with the replaced id
      var inserts = []
      var from_replace = from_person_id
      var to_replace = to_person_id


      flatten(_accounts).forEach(_indexuserlogin => {
        _indexuserlogin._prev_id =  _indexuserlogin._prev_id || []
        _indexuserlogin._prev_id.push(_indexuserlogin._id)
        _indexuserlogin._id = _indexuserlogin._id.replace(from_replace, to_replace)
        inserts.push(_indexuserlogin)
      })

      flatten(data.related.indexpersonfingerprints).forEach(_indexpersonfingerprints => {
        _indexpersonfingerprints._prev_id =  _indexpersonfingerprints._prev_id || []
        _indexpersonfingerprints._prev_id.push(_indexpersonfingerprints._id)
        _indexpersonfingerprints._id = _indexpersonfingerprints._id.replace(from_replace, to_replace)
        inserts.push(_indexpersonfingerprints)
      })

      flatten(data.related.loginfingerprints).forEach(_loginfingerprints => {
        _loginfingerprints._prev_id =  _loginfingerprints._prev_id || []
        _loginfingerprints._prev_id.push(_loginfingerprints._id)
        _loginfingerprints._id = _loginfingerprints._id.replace(from_replace, to_replace)
        inserts.push(_loginfingerprints)
      })



      data.from.accounts.forEach(_account => {
        var __account = clone(_account)
        __account.logins.forEach(_login => {
          delete _login._ids
          _login._prev_id =  _login._prev_id || []
          _login._prev_id.push(_login._id)
          _login._id = _login._id.replace(from_replace, to_replace)
          _login.account_id = _login.account_id.replace(from_replace, to_replace)
          inserts.push(_login)
        })
        delete __account.logins
        delete __account._ids
        __account._prev_id =  __account._prev_id || []
        __account._prev_id.push(__account._id)
        __account._id = __account._id.replace(from_replace, to_replace)
        inserts.push(__account)
      })
      delete data.from.accounts
      data.from._prev_id =  data.from._prev_id || []
      data.from._prev_id.push(data.from._id)
      data.from._id = data.from._id.replace(from_replace, to_replace)
      inserts.push(data.from)

      async.each(inserts, function (_insert, done) {
        db.put(_insert._id, _insert, function (err) {
          if (err) return done(err)
          // delete the last prev id
          var prev_id = _insert._prev_id[_insert._prev_id.length-1]
          db.del(prev_id, done)
        })
      }, cb)
    })
  })
}

exports.findRelated = function (db, from_person_id, cb) {
  var key = 'indexpersonfingerprint/' + from_person_id
  allDetails(db, key).pipe(concat(function (indexpersonfingerprints) {
    var from_person_fingerprints = indexpersonfingerprints.map(index_person_to_fingerprint_doc => {
      return idSplit(index_person_to_fingerprint_doc).fingerprint
    })
    async.map(from_person_fingerprints, function (from_person_fingerprint, done) {
      allDetails(db, from_person_fingerprint).pipe(concat(function (loginfingerprints) {
        done(null, loginfingerprints)
      }))
    }, function (err, loginfingerprints) {
      cb(null, {
        indexpersonfingerprints: indexpersonfingerprints,
        loginfingerprints: loginfingerprints
      })
    })
  }))
}
