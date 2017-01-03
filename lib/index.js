var addFingerprint = require('./addFingerprint')
var login = require('./login')
var person = require('./person')
var allDetails = require('./allDetails')
var merge = require('./merge')

module.exports = function (db) {
  return {
    // yes I could bind all these, but for people using the api, this is easier to follow
    addFingerprint: function (fingerprint, deviceInfo, cb) {
      return addFingerprint(db, fingerprint, deviceInfo, cb)
    },
    addLogin: function (fingerprint, userloginID, loginType, app, space, details, cb) {
      if (!cb && typeof details === 'function') {
        cb = details
        details = null
      }
      return login(db, fingerprint, userloginID, loginType, app, space, details, cb)
    },
    getLogin: function (app, space, userloginID, cb) {
      db.query('fingerprints/person_by_login', {
        key: [app, space, userloginID],
        include_docs: true
      }, function (err, results) {
        if (err) return cb(err)
        return cb(null, results.rows)
      })
    },
    findPerson: function (fingerprint, app, space, cb) {
      return person.byFingerprint(db, fingerprint, app, space, cb)
    },
    findDetails: function (fingerprint) {
      return allDetails(db, fingerprint)
    },
    mergePerson: function (from_person_id, to_person_id, cb) {
      return merge.person(db, from_person_id, to_person_id, cb)
    },
    getPerson: function (person_id, cb) {
      return person.build_tree(db, person_id, cb)
    },
    personFingerprints: function (person_id, cb) {
      db.query('fingerprints/by_person', {
        key: person_id
      }, function (err, results) {
        if (err) return cb(err)
        cb(null, results.rows.map(function (row) {
          var parts = row.id.split('/')
          parts.shift()
          return {
            fingerprint: row.value,
            login_id: parts.join('/')
          }
        }))
      })
    },
    similarFingerprints: function (prefix, cb) {
      var end = prefix + '~ÿ'
      db.query('fingerprints', {
        startkey: prefix,
        endkey: end
      }, function (err, results) {
        if (err) return cb(err)
        var _results = results.rows.map(function (row) {
          return row.id
        }).filter(function (id) {
          return id !== prefix
        })

        cb(null, _results)
      })
    }
  }
}
