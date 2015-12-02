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
        t.error(err, 'space 1 login')

        whoaru.login(fingerprint, userloginID, loginType, app, space2, loginDetails, function (err, person2) {
          t.error(err, 'space 2 login')

          whoaru.person(fingerprint, app, space, function (err, person_test) {
            t.error(err, 'space 1 lookup')
            t.equals(person1._id, person_test._id, 'fingerprints match first app and space')
            // assert that the right account is selected
            person_test.accounts.forEach(_account => {
              if (_account.space === space) t.ok(_account.selected, 'the correct account is selected')
            })

            // check the other account is selected
            whoaru.person(fingerprint, app, space2, function (err, person_test2) {
              t.error(err, 'space 2 lookup')
              t.equals(person2._id, person_test2._id)
              // assert that the right account is selected
              person_test2.accounts.forEach(_account => {
                if (_account.space === space2) t.ok(_account.selected)
              })

              t.end()
            })
          })
        })
      })
    })
  })
})

test('test same fingerprint used in same space on different apps', function (t) {
  var app2 = 'engine'
  setup('test3', t, function (err, db) {
    if (err) return console.log(err)
    var whoaru = Whoaru(db)
    whoaru.addFingerprint(fingerprint, function (err) {
      t.error(err)
      whoaru.login(fingerprint, userloginID, loginType, app, space, loginDetails, function (err, person1) {
        t.error(err)

        whoaru.login(fingerprint, userloginID, loginType, app2, space, loginDetails, function (err, person2) {
          t.error(err)

          whoaru.person(fingerprint, app, space, function (err, person_test) {
            t.error(err)
            t.equals(person1._id, person_test._id)

            whoaru.person(fingerprint, app2, space, function (err, person_test2) {
              t.error(err)
              t.equals(person2._id, person_test2._id)
              t.end()
            })
          })
        })
      })
    })
  })
})

test('test same fingerprint used to login with a different loginType, same space, and app', function (t) {
  var userloginID2 = '12345334'
  var loginType2 = 'facebook'
  var loginDetails2 = {
    id: 12345334,
    id_str: '12345334',
    name: 'facebook_R',
    screen_name: 'rua',
    location: '',
    profile_location: null,
    description: ''
  }
  setup('test4', t, function (err, db) {
    if (err) return console.log(err)
    var whoaru = Whoaru(db)
    whoaru.addFingerprint(fingerprint, function (err) {
      t.error(err)
      whoaru.login(fingerprint, userloginID, loginType, app, space, loginDetails, function (err, person1) {
        t.error(err)

        whoaru.login(fingerprint, userloginID2, loginType2, app, space, loginDetails2, function (err, person2) {
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

test('test different fingerprint, but same userLoginID', function (t) {
  var fingerprint2 = '2abced2'
  setup('test5', t, function (err, db) {
    if (err) return console.log(err)
    var whoaru = Whoaru(db)
    whoaru.addFingerprint(fingerprint, function (err) {
      t.error(err)
      whoaru.login(fingerprint, userloginID, loginType, app, space, loginDetails, function (err, person1) {
        t.error(err)
        whoaru.addFingerprint(fingerprint2, function (err) {
          t.error(err)
          whoaru.login(fingerprint2, userloginID, loginType, app, space, loginDetails, function (err, person2) {
            t.equal(person1._id, person2._id, 'person should be matched by userLoginID')
            t.equal(person2.accounts.length, 1, 'only one account')
            t.equal(person2.accounts[0].space, space, 'account is the right space')
            t.ok(person2.accounts[0].selected, 'correct account is selected')
            t.error(err)
            t.end()
          })
        })
      })
    })
  })
})

test('test different fingerprint and space, but same userLoginID', function (t) {
  var fingerprint2 = '2abced2'
  var space2 = 'rwp-2037'
  setup('test6', t, function (err, db) {
    if (err) return console.log(err)
    var whoaru = Whoaru(db)
    whoaru.addFingerprint(fingerprint, function (err) {
      t.error(err)
      whoaru.login(fingerprint, userloginID, loginType, app, space, loginDetails, function (err, person1) {
        t.error(err)
        whoaru.addFingerprint(fingerprint2, function (err) {
          t.error(err)
          whoaru.login(fingerprint2, userloginID, loginType, app, space2, loginDetails, function (err, person2) {
            t.error(err)

            // this should create a new account, because its a different space, but linked to the same person
            t.ok((person2.accounts.length > 1), 'should have two seperete spaces')

            t.equal(person1._id, person2._id, 'person should be matched by userLoginID')
            // assert that the right account is selected
            person2.accounts.forEach(_account => {
              if (_account.space === space2) t.ok(_account.selected, 'the correct account is selected')
              else t.notOk(_account.selected, 'other accounts are not selected')
            })
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
