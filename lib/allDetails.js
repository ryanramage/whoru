module.exports = function allDetails (db, prefix, include_root) {
  if (!include_root) prefix += '/'
  var end = prefix + '~'
  return db.createValueStream({
    gte: prefix,
    lt: end
  })
}
