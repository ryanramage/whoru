var Whoaru = require('../lib/index')
var test = require('tape')

var levelup = require('levelup')

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

test('test basic sequence: adding a fingerprint, login, and search', function (t) {
  setup('test1', t, function (err, db) {
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

test('test same fingerprint used in two spaces on the same app', function (t) {
  var space2 = 'rwp-2037'
  setup('test2', t, function (err, db) {
    if (err) return console.log(err)
    var whoaru = Whoaru(db)
    whoaru.addFingerprint(fingerprint, function (err) {
      t.error(err)
      whoaru.login(fingerprint, userloginID, loginType, app, space, loginDetails, function (err, person1) {
        t.error(err)

        whoaru.login(fingerprint, userloginID, loginType, app, space2, loginDetails, function (err, person2) {
          t.error(err)

          whoaru.person(fingerprint, app, space, function (err, person_test) {
            t.error(err)
            t.equals(person1._id, person_test._id)
            t.end()
          })

        })
      })
    })
  })
})

function setup (name, t, cb) {
  levelup('/' + name, {
    db: require('memdown'),
    valueEncoding: 'json'
  }, function (err, db) {
    t.error(err)
    cb(err, db)
  })
}
