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
      }
    }
  }
  db.put(ddoc).catch(cb).then(cb)
}
