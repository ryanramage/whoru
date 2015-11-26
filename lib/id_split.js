module.exports = function (doc) {
  var results = {}
  var parts = doc._id.split('/')
  if (doc.type === 'loginfingerprint') {
    results.fingerprint = parts[0]
    results.person_doc_uuid = parts[1]
    results.account_doc_uuid = parts[2]
    results.userloginID = parts[3]
  } else {
    results.person_doc_uuid = parts[0]
    if (parts[1]) results.account_doc_uuid = parts[1]
    if (parts[2]) results.userloginID = parts[2]
  }
  return results
}