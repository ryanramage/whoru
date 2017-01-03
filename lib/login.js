var person = require('./person')
var async = require('async')
var squuid = require('squuid')

module.exports = function login (db, fingerprint, userloginID, loginType, app, space, details, cb) {
  // check to see if we can find an existing user, we dont even need a fingerprint
  person.person_by_login(db, app, space, userloginID, function (err, results) {
    if (err) return cb(err)
    if (results.length > 1) return cb('never should two people be linked to the same person_by_login')

    // make sure havePerson always adds a fingerprint if we get it and missing docs
    if (results.length === 1) return havePerson(db, results[0].value, fingerprint, userloginID, loginType, app, space, details, cb)


    if (!fingerprint || fingerprint === '') {
      return firstTimer(db, fingerprint, userloginID, loginType, app, space, details, cb)
    }

    // lets see if we can find a person by fingerprint
    person.byFingerprint(db, fingerprint, app, space, function (err, _person) {
      // samePersonNewAccount
      if (err && err.no_account && err.person && err.person._id) return havePerson(db, err.person._id, fingerprint, userloginID, loginType, app, space, details, cb)
      if (err) return cb(err)
      if (_person) return havePerson(db, _person._id, fingerprint, userloginID, loginType, app, space, details, cb)

      // we've got nothing. a totally new person
      return firstTimer(db, fingerprint, userloginID, loginType, app, space, details, cb)
    })
  })
}

function havePerson (db, person_doc_uuid, fingerprint, userloginID, loginType, app, space, details, cb) {
  var account_doc_uuid = [app, space].join('~')

  var fingerprint_doc = {
    _id: fingerprint,
    deviceInfo: {}
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

  var index_person_to_fingerprint_doc = {
    _id: ['indexpersonfingerprint', person_doc_uuid, fingerprint].join('/'),
    type: 'indexpersonfingerprint'
  }
  var ok_to_conflict = function (doc, done) {
    db.put(doc, function (err, resp) {
      if (err && err.status === 409) return done()
      if (err) return done(err)
      done(null)
    })
  }
  async.series([
    ok_to_conflict.bind(db, fingerprint_doc),
    ok_to_conflict.bind(db, account_doc),
    ok_to_conflict.bind(db, login_doc),
    ok_to_conflict.bind(db, login_fingerprint_doc),
    ok_to_conflict.bind(db, index_doc),
    ok_to_conflict.bind(db, index_person_to_fingerprint_doc)
  ], function (err) {
    if (err) return cb(err)
    return cb(null, login_doc)
  })
}

function firstTimer (db, fingerprint, userloginID, loginType, app, space, details, cb) {
  var person_doc_uuid = squuid()
  var account_doc_uuid = [app, space].join('~')

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
  var index_person_to_fingerprint_doc = {
    _id: ['indexpersonfingerprint', person_doc_uuid, fingerprint].join('/'),
    type: 'indexpersonfingerprint'
  }

  var ok_to_conflict = function (doc, done) {
    db.put(doc, function (err, resp) {
      if (err && err.status === 409) return done()
      if (err) return done(err)
      done()
    })
  }

  var steps = [
    db.put.bind(db, person_doc),
    db.put.bind(db, account_doc),
    db.put.bind(db, login_doc),
    db.put.bind(db, index_doc),
  ]

  if (fingerprint && fingerprint !== '') {
    steps.push(ok_to_conflict.bind(null, login_fingerprint_doc))
    steps.push(ok_to_conflict.bind(null, index_person_to_fingerprint_doc))
  }

  async.series(steps, function (err) {
    if (err) return cb(err)
    return cb(null, login_doc)
  })
}
