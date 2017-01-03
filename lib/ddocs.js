module.exports = function (db, cb) {
  var ddoc = {
    _id: '_design/fingerprints',
    views: {
      fingerprints: {
        map: function (doc) {
          if (!doc.type) emit(doc._id) // eslint-disable-line
        }.toString()
      },
      by_person: {
        map: function (doc) {
          if (doc.type !== 'loginfingerprint') return
          var parts = doc._id.split('/')
          var fp = parts[0]
          var person = parts[1]
          if (!fp || !person) return
          emit(person, fp) // eslint-disable-line
        }.toString()
      },
      person_by_login: {
        map: function (doc) {
          if (doc.type !== 'login') return
          var parts = doc._id.split('/')
          if (parts.length !== 3) return
          var person = parts[0]
          var appspace = parts[1]
          var key = appspace.split('~')
          if (key.length !== 2) return
          var userloginID = parts[2]
          key.push(userloginID)
          emit(key, person) // eslint-disable-line
        }.toString()
      }
    }
  }
  db.put(ddoc).then(cb).catch(cb)
}
