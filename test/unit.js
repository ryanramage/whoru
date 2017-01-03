var Whoaru = require('../lib/index')
var test = require('tape')
var PouchDB = require('pouchdb')
var ddocs = require('../lib/ddocs')
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
      t.error(err, 'callback ok')
      whoaru.addLogin(fingerprint, userloginID, loginType, app, space, loginDetails, function (err, person) {
        t.error(err, 'callback ok')
        t.end()
      })
    })
  })
})

test('adding a fingerprint twice', function (t) {
  setup('test1b', t, function (err, db) {
    if (err) return console.log(err)
    var whoaru = Whoaru(db)
    whoaru.addFingerprint(fingerprint, function (err) {
      t.error(err, 'callback ok')
      whoaru.addFingerprint(fingerprint, function (err) {
        t.error(err, 'callback ok')
        t.end()
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
      t.error(err, 'callback ok')
      whoaru.addLogin(fingerprint, userloginID, loginType, app, space, loginDetails, function (err, login1) {
        t.error(err, 'space 1 login')

        whoaru.addLogin(fingerprint, userloginID, loginType, app, space2, loginDetails, function (err, login2) {
          t.error(err, 'space 2 login')


          whoaru.findPerson(fingerprint, app, space, function (err, person_test) {
            t.error(err, 'space 1 lookup')

            var person1_id = login1._id.split('/')[0]
            t.equals(person1_id, person_test._id, 'fingerprints match first app and space')
            // assert that the right account is selected
            person_test.accounts.forEach(_account => {
              if (_account.space === space) t.ok(_account.selected, 'the correct account is selected')
            })

            // check the other account is selected
            whoaru.findPerson(fingerprint, app, space2, function (err, person_test2) {
              t.error(err, 'space 2 lookup')
              var person2_id = login2._id.split('/')[0]
              t.equals(person2_id, person_test2._id, 'same person linked to both spaces')
              // assert that the right account is selected
              person_test2.accounts.forEach(_account => {
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
})

test('test same fingerprint used in same space on different apps', function (t) {
  var app2 = 'engine'
  setup('test3', t, function (err, db) {
    if (err) return console.log(err)
    var whoaru = Whoaru(db)
    whoaru.addFingerprint(fingerprint, function (err) {
      t.error(err, 'callback ok')
      whoaru.addLogin(fingerprint, userloginID, loginType, app, space, loginDetails, function (err, login1) {
        t.error(err, 'callback ok')

        whoaru.addLogin(fingerprint, userloginID, loginType, app2, space, loginDetails, function (err, login2) {
          t.error(err, 'callback ok')

          whoaru.findPerson(fingerprint, app, space, function (err, person_test) {
            t.error(err, 'callback ok')
            var person1_id = login1._id.split('/')[0]
            t.equals(person1_id, person_test._id, 'same person on lookup')

            whoaru.findPerson(fingerprint, app2, space, function (err, person_test2) {
              t.error(err, 'callback ok')
              var person2_id = login2._id.split('/')[0]
              t.equals(person2_id, person_test2._id, 'same person on other lookup')
              t.ok((person_test2.accounts.length > 1), 'should have two seperete accounts')
              person_test2.accounts.forEach(_account => {
                if (_account.space === space && _account.app === app2) t.ok(_account.selected, 'the correct account is selected')
                else t.notOk(_account.selected, 'other accounts are not selected')
              })
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
      t.error(err, 'callback ok')
      whoaru.addLogin(fingerprint, userloginID, loginType, app, space, loginDetails, function (err, login1) {
        t.error(err, 'callback ok')

        whoaru.addLogin(fingerprint, userloginID2, loginType2, app, space, loginDetails2, function (err, login2) {
          t.error(err, 'callback ok')

          whoaru.findPerson(fingerprint, app, space, function (err, person_test) {
            t.error(err, 'callback ok')
            var person1_id = login1._id.split('/')[0]
            t.equals(person1_id, person_test._id, 'same person')
            t.equal(person_test.accounts.length, 1, 'only one account')
            t.equal(person_test.accounts[0].space, space, 'account is the right space')
            t.ok(person_test.accounts[0].selected, 'correct account is selected')

            // there should be two login docs
            t.equal(person_test.accounts[0].logins.length, 2, 'two logins')
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
      t.error(err, 'callback ok')
      whoaru.addLogin(fingerprint, userloginID, loginType, app, space, loginDetails, function (err, login1) {
        t.error(err, 'callback ok')
        whoaru.addFingerprint(fingerprint2, function (err) {
          t.error(err, 'callback ok')
          whoaru.addLogin(fingerprint2, userloginID, loginType, app, space, loginDetails, function (err, login2) {
            t.error(err, 'callback ok')
            var person1_id = login1._id.split('/')[0]
            var person2_id = login2._id.split('/')[0]
            t.equal(person1_id, person2_id, 'person should be matched by userLoginID')


            // check that we can retrieve the person by the fingerprint2
            whoaru.findPerson(fingerprint2, app, space, function (err, person_test) {
              t.error(err, 'callback ok')
              t.equal(person_test._id, person1_id, 'found the right person')
              t.end()
            })
          })
        })
      })
    })
  })
})

test('merge two people into one', function (t) {
  var fingerprint2 = '2abced2'
  var userloginID2 = 'asff2fdsd'
  setup('test7', t, function (err, db) {
    if (err) return console.log(err)
    var whoaru = Whoaru(db)
    whoaru.addFingerprint(fingerprint, function (err) {
      t.error(err, 'callback ok')
      whoaru.addLogin(fingerprint, userloginID, loginType, app, space, loginDetails, function (err, login1) {
        t.error(err, 'callback ok')
        whoaru.addFingerprint(fingerprint2, function (err) {
          t.error(err, 'callback ok')
          whoaru.addLogin(fingerprint2, userloginID2, loginType, app, space, loginDetails, function (err, login2) {
            t.error(err, 'callback ok')

            var person1_id = login1._id.split('/')[0]
            var person2_id = login2._id.split('/')[0]

            whoaru.mergePerson(person2_id, person1_id, function (err) {
              t.error(err, 'successfully merged')
              whoaru.getPerson(person1_id, function (err, person_full) {
                t.error(err, 'callback ok')
                t.equals(person_full.accounts.length, 1, 'account got merged because it was the same app and space')
                t.equals(person_full.accounts[0].logins.length, 2, 'logins were different so they did not get merged')
                t.end()
              })
            })
          })
        })
      })
    })
  })
})

test('test null fingerprint on login, and then login with a not null later sequence, and search', function (t) {
  setup('test8', t, function (err, db) {
    if (err) return console.log(err)
    var whoaru = Whoaru(db)

    whoaru.addLogin(null, userloginID, loginType, app, space, loginDetails, function (err, login1) {
      t.error(err, 'callback ok')
      whoaru.addLogin(fingerprint, userloginID, loginType, app, space, loginDetails, function (err, login2) {
        t.error(err, 'callback ok')

        // now we should be able to find the person
        whoaru.findPerson(fingerprint, app, space, function (err, person_test) {
          t.error(err, 'callback ok')
          var person1_id = login1._id.split('/')[0]
          t.equal(person_test._id, person1_id, 'found the right person')
          t.end()
        })

      })
    })
  })
})



function setup (name, t, cb) {
  var db = new PouchDB(name, {db: require('memdown')})
  ddocs(db, function (err) {
    cb(null, db)
  })
}
