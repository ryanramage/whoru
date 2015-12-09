module.exports = function allDetails (db, prefix, include_root, cb) {
  if (!cb && typeof include_root === 'function') {
    cb = include_root
    include_root = null
  }
  if (!include_root) prefix += '/'
  var end = prefix + '~'
  db.allDocs({
    startkey: prefix,
    endkey: end,
    include_docs: true
  }, cb)
}
