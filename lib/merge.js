var async = require('async')
var concat = require('concat-stream')
var flatten = require('lodash.flatten')
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
      data.related.indexuserlogin = flatten(_accounts)
      // lets build an array of inserts

      cb(null, data)
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
