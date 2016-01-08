module.exports = function (db, cb) {
  var ddoc = {
    _id: '_design/fingerprints',
    views: {
      fingerprints: {
        map : function (doc) {
          if (!doc.type) emit(doc._id)
        }.toString()
      }
    }
  }
  db.put(ddoc).then(cb)
}
