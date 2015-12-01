# whoru

# SUPER ALPHA WARNING. Please wait till this message disappears before using.

Who are you? Tackle the thorny issue of identity association.

This module just tries to relate the following nouns.

Nouns:

 - *fingerprint*: a hash that represents a single device.
 - *login*. A single login path that has a bunch of device fingerprints. We will need to associate an login to a fingerprint at login.
 - *account*. A user account. Might have multiple login paths, eg email, oauth through providers. 
 - *person*. A person has one or more user accounts and fingerprints.
 - *app* an logical thing a Person uses, like the engine, redforms, or hometribe
 - *space* like a realtors website. It is the partition of data in an app so data does not bleed between websites. 

Relationships of the nouns

Person 1-* Account 1-* Login 1-* LoginFingerprint *-1 Fingerprint

The account object should have a AppSpaceID property on it. Like 'rwp_1232-engine'

The AccountFingerprint ID will be composed  `fingerprint/loginID/accountID/PersonID` as it is the main join.




```
npm install whoru
```

## Usage

``` js
var levelup = require('levelup')
var db = levelup('./mydb')
var whoru = require('whoru')(db)


// somewhere on the client
var Fingerprint2 = require('fingerprint2')
new Fingerprint2().get(function (fingerprint, components) {
  console.log('your device fingerpring', fingerprint)
})

// ##############################
// Add the fingerprint to the db
// back to where we have whoru
whoru.addFingerprint(fingerprint)
whoru.addFingerprint(fingerprint, deviceInfo)
whoru.addFingerprint(fingerprint, deviceInfo, function(err) {   
  // err if there was a problem adding the fingerprint
})

// ################################
// associate the fingerprint with the login and, eg after they login
whoru.login(fingerprint, userloginID, loginType, app, space, details, function (err, person) {
  
})

// lookup the Person from a fingerprint, given the least info you know
whoru.lookup(fingerprint, app, space, function (err, person) {
  
})

// object stream of all accounts of a fingerprint
whoru.allDetails(fingerprint).pipe(through2.obj(function(detail, enc, cb) {
  console.log(detail.doc) //the actual doc one of
  switch(detail.type) {
    case 'login'
    case 'account'
    case 'person'
  }
}))









```

## License

MIT
