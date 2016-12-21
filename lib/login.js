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

      if (logins && logins.length && !_person) {
        var person_doc_uuid = logins[0].person_doc_uuid
        return person.build_tree(db, person_doc_uuid, function (err, _person) {
          if (err) return cb(err)
          // check if the person has a matching account
          var existingAccount
          _person.accounts.forEach(function (_account) {
            if (_account.space === space && _account.app === app) existingAccount = true
          })
          if (existingAccount) {
            // add the fingerprint
            var selector = person.selectPath(_person, app, space)
            return addFingerprint(db, _person, selector.selected_account, fingerprint, userloginID, function (err) {
              cb(err, _person)
            })
          }
          return samePersonNewAccount(db, _person, fingerprint, userloginID, loginType, app, space, details, selectPath)
        })
      }
      if (logins && logins.length) {
        person_doc_uuid = logins[0].person_doc_uuid
        return person.build_tree(db, person_doc_uuid, selectPath)
      }
      if (_person && !logins) {
        // check if any accounts fit
        var existingAccount
        _person.accounts.forEach(function (_account) {
          if (_account.space === space && _account.app === app) existingAccount = _account
        })
        if (existingAccount) {
          // this is the same person, but a new login
          return samePersonAccountNewLogin(db, _person, existingAccount, fingerprint, userloginID, loginType, app, space, details, selectPath)
        } else {
          return samePersonNewAccount(db, _person, fingerprint, userloginID, loginType, app, space, details, selectPath)
        }
      }
      if (!_person) return firstTimer(db, fingerprint, userloginID, loginType, app, space, details, selectPath)

      selectPath(null, _person)
    })
  })
}

function addFingerprint (db, person, account_doc, fingerprint, userloginID, cb) {
  var person_doc_uuid = person._id
  var account_doc_uuid = account_doc._ids.account_doc_uuid
  var login_fingerprint_doc = {
    _id: [fingerprint, person_doc_uuid, account_doc_uuid, userloginID].join('/'),
    type: 'loginfingerprint'
  }
  var index_person_to_fingerprint_doc = {
    _id: ['indexpersonfingerprint', person_doc_uuid, fingerprint].join('/'),
    type: 'indexpersonfingerprint'
  }

  var ok_to_conflict = function (doc, prev, done) {
    if (!done && typeof prev === 'function') {
      done = prev
    }
    db.put(doc, function (err, resp) {
      if (err && err.status === 409) return done()
      if (err) return done(err)
      done(null)
    })
  }
  async.waterfall([
    ok_to_conflict.bind(db, login_fingerprint_doc),
    ok_to_conflict.bind(db, index_person_to_fingerprint_doc)
  ], function (err) {
    if (err) return cb(err)
    return cb(null, person)
  })
}

function samePersonAccountNewLogin (db, person, account_doc, fingerprint, userloginID, loginType, app, space, details, cb) {
  var person_doc_uuid = person._id
  var account_doc_uuid = account_doc._ids.account_doc_uuid

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

  var ok_to_conflict = function (doc, prev, done) {
    if (!done && typeof prev === 'function') {
      done = prev
    }
    db.put(doc, function (err, resp) {
      if (err && err.status === 409) return done()
      if (err) return done(err)
      done(null)
    })
  }
  async.waterfall([
    db.put.bind(db, login_doc),
    db.put.bind(db, login_fingerprint_doc),
    db.put.bind(db, index_doc),
    ok_to_conflict.bind(db, index_person_to_fingerprint_doc)
  ], function (err) {
    if (err) return cb(err)

    account_doc.selected = true
    person.selected = true
    login_doc.selected = true
    account_doc.logins = account_doc.logins || []
    account_doc.logins.push(login_doc)
    if (person.accounts) person.accounts.push(account_doc)
    else person.accounts = [account_doc]
    return cb(null, person)
  })
}

function samePersonNewAccount (db, person, fingerprint, userloginID, loginType, app, space, details, cb) {
  var person_doc_uuid = person._id
  var account_doc_uuid = [app, space].join('~')
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

  var ok_to_conflict = function (doc, prev, done) {
    db.put(doc, function (err, resp) {
      if (err && err.status === 409) return done()
      if (err) return done(err)
      done(null)
    })
  }
  async.waterfall([
    db.put.bind(db, account_doc),
    db.put.bind(db, login_doc),
    ok_to_conflict.bind(db, login_fingerprint_doc),
    db.put.bind(db, index_doc),
    ok_to_conflict.bind(db, index_person_to_fingerprint_doc)
  ], function (err) {
    if (err) return cb(err)

    account_doc.selected = true
    person.selected = true
    login_doc.selected = true
    if (person.accounts) person.accounts.push(account_doc)
    else person.accounts = [account_doc]
    account_doc.logins = [login_doc]

    return cb(null, person)
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
  async.waterfall([
    db.put.bind(db, person_doc),
    db.put.bind(db, account_doc),
    db.put.bind(db, login_doc),
    db.put.bind(db, login_fingerprint_doc),
    db.put.bind(db, index_doc),
    db.put.bind(db, index_person_to_fingerprint_doc)
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
