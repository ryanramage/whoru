var Whoaru = require('../lib/index')
var test = require('tape')

var levelup = require('levelup')

test('a simple plan', function (t) {
  var fingerprint = 'abced'
  var app = 'forms'
  var space = 'rwp-1937'
  var userloginID = '3884025854'
  var loginType = 'twitter'
  var loginDetails = {
    id: 3884025854,
    id_str: '3884025854',
    name: 'yegjs',
    screen_name: 'r2yeg',
    location: '',
    profile_location: null,
    description: ''
  }

  levelup('/some/location3', {
    db: require('memdown'),
    valueEncoding: 'json'
  }, function (err, db) {
    t.error(err)
    if (err) return console.log(err)
    var whoaru = Whoaru(db)
    whoaru.addFingerprint(fingerprint, function (err) {
      t.error(err)
      whoaru.login(fingerprint, userloginID, loginType, app, space, loginDetails, function (err, person) {
        t.error(err)

        whoaru.person(fingerprint, app, space, function (err, person2) {
          t.error(err)
          t.equals(person._id, person2._id)
          t.end()
        })
      })
    })

  })
})
