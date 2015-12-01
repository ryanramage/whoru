var person = require('./person')
var async = require('async')
var squuid = require('squuid')

module.exports = function login (db, fingerprint, userloginID, loginType, app, space, details, cb) {

  var _selectPath = function (done, err, _person) {
    if (err) return done(err, _person)
    if (!_person) return done(null, null)
    // lets select all the matching things
    var selector = person.selectPath(_person, app, space)
    done(null, selector.person)
  }
  var selectPath = _selectPath.bind(null, cb)
  // check if we have any deails
  person.byFingerprint(db, fingerprint, app, space, function (err, _person) {
    if (err && err.no_account && err.person) {
      return samePersonNewAccount(db, err.person, fingerprint, userloginID, loginType, app, space, details, selectPath)
    }
    if (err) return cb(err)

    person.by_userLoginID(db, userloginID, function (err, logins) {
      if (err) return cb(err)

      if (logins && logins.length) {
        var person_doc_uuid = logins[0].person_doc_uuid
        return person.build_tree(db, person_doc_uuid, selectPath)
      }

      if (!_person) return firstTimer(db, fingerprint, userloginID, loginType, app, space, details, selectPath)

      selectPath(null, _person)
    })
  })
}

function samePersonNewAccount (db, person, fingerprint, userloginID, loginType, app, space, details, cb) {
  var person_doc_uuid = person._id
  var account_doc_uuid = squuid()
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
  var index_doc = {
    _id: ['indexuserlogin', userloginID, account_doc_uuid, person_doc_uuid].join('/'),
    type: 'indexuserloginid'
  }
  async.waterfall([
    db.put.bind(db, account_doc._id, account_doc),
    db.put.bind(db, login_doc._id, login_doc),
    db.put.bind(db, login_fingerprint_doc._id, login_fingerprint_doc),
    db.put.bind(db, index_doc._id, index_doc)
  ], function (err) {
    if (err) return cb(err)

    account_doc.selected = true
    person.selected = true
    login_doc.selected = true
    person.accounts = [account_doc]
    account_doc.logins = [login_doc]

    return cb(null, person)
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
  var index_doc = {
    _id: ['indexuserlogin', userloginID, account_doc_uuid, person_doc_uuid].join('/'),
    type: 'indexuserloginid'
  }

  async.waterfall([
    db.put.bind(db, person_doc._id, person_doc),
    db.put.bind(db, account_doc._id, account_doc),
    db.put.bind(db, login_doc._id, login_doc),
    db.put.bind(db, login_fingerprint_doc._id, login_fingerprint_doc),
    db.put.bind(db, index_doc._id, index_doc)
  ], function (err) {
    if (err) return cb(err)

    account_doc.selected = true
    person_doc.selected = true
    login_doc.selected = true
    person_doc.accounts = [account_doc]
    account_doc.logins = [login_doc]

    return cb(null, person_doc)
  })
}
