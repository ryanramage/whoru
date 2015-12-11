# whoru

# SUPER ALPHA WARNING. Please wait till this message disappears before using.

Who are you? Tackle the thorny issue of identity association.

This module just tries to relate the following nouns.

Nouns:

 - *fingerprint*: a hash that represents a single device.
 - *login*. A single login, eg email, social, oauth, that has a bunch of device fingerprints. We will need to associate an login to a fingerprint at login.
 - *account*. A user account. Might have multiple logins. 
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

First of all, you need to fingerprint on the client device. Something like


    // somewhere on the client
    var Fingerprint2 = require('fingerprint2')
    new Fingerprint2().get(function (fingerprint, components) {
      console.log('your device fingerpring', fingerprint)
    })

Back on the server you will add this fingerprint as soon as you can. Eg, you dont need login info

    // whoru is backed by a pouchdb
    var db = new PouchDB('whoru')
    var whoru = require('whoru')(db)


    // ##############################
    // Add the fingerprint to the db
    // back to where we have whoru
    whoru.addFingerprint(fingerprint)
    whoru.addFingerprint(fingerprint, deviceInfo)
    whoru.addFingerprint(fingerprint, deviceInfo, function(err) {   
      // err if there was a problem adding the fingerprint
    })


Now assume the person logins in. At this point we know a lot more about the person. You should inform whoaru with this info
The details of all the params

 - fingerprint which was obtained from before
 - userLoginID. Some unique id from your login service. Could be a primary key from a DB or an ID from a OAUTH service.
 - loginType. A string to indentify how the userLoginID is unique. EG, 'db', 'facebook', 'twitter'
 - app. A string to identify the app they logged into, in a multi-app environment, Eg 'wiki', 'forum', 'chat'
 - space. A logical grouping across apps. Useful if you host multiple websites with different branding. Eg 'coke', '7-up'
 - details. Any additional data you want to store about the login

Here is an example of the call:

    // ################################
    // associate the fingerprint with the login and, eg after they login
    whoru.addLogin(fingerprint, userloginID, loginType, app, space, details, function (err, person) {
      
    })

Now sometime later, you want to see who an anonymous user is.

    // lookup the Person from a fingerprint, given the least info you know
    whoru.findPerson(fingerprint, app, space, function (err, person) {
      
    })

Or find any related details of a fingerprint

    // object stream of all details of a fingerprint, will include login, account, and person details
    whoru.findDetails(fingerprint).pipe(through2.obj(function(detail, enc, cb) {
      console.log(detail.doc) //the actual doc one of
      switch(detail.type) {
        case 'login'
        case 'account'
        case 'person'
      }
    }))

The end user can decided that two users are actually the same, and decide to merge them

    whoaru.mergePerson(from_person_id, to_person_id, function(err)) {

    }









```

## License

MIT
