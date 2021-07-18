const functions = require('firebase-functions');
const admin = require('firebase-admin');
const mimeTypes = require('mimetypes');
const axios = require('axios');
// const { user } = require('firebase-functions/lib/providers/auth');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

admin.initializeApp();

exports.createDriver = functions.https.onCall(async (data, context) => {
  checkAuthentication(context, true);
  dataValidator(data, {
    driverName: 'string',
  });

  const driver = await admin
    .firestore()
    .collection('drivers')
    .where('name', '==', data.driverName)
    .limit(1)
    .get();
  if (!driver.empty) {
    throw new functions.https.HttpsError(
      'already-exists',
      'This driver already exists'
    );
  }
  return admin.firestore().collection('drivers').add({
    name: data.driverName,
  });
});

exports.createTruck = functions.https.onCall(async (data, context) => {
  checkAuthentication(context, true);
  dataValidator(data, {
    truckRegistration: 'string',
    driverId: 'string',
    truckImage: 'string',
    condition: 'string',
    odo: 'string',
  });
  const mimeType = data.truckImage.match(
    /data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/
  )[1];
  const base64EncodedImageString = data.truckImage.replace(
    /^data:image\/\w+;base64,/,
    ''
  );
  const imageBuffer = new Buffer.Alloc(base64EncodedImageString, 'base64');

  const filename = `truckImages/${data.bookName}.${mimeTypes.detectExtension(
    mimeType
  )}`;
  const file = admin.storage().bucket().file(filename);
  await file.save(imageBuffer, {contentType: 'image/jpeg'});
  const fileUrl = await file
    .getSignedUrl({action: 'read', expires: '03-09-2491'})
    .then((urls) => urls[0]);

  return admin
    .firestore()
    .collection('trucks')
    .add({
      registration: data.truckRegistration,
      imageUrl: fileUrl,
      driver: admin.firestore().collection('drivers').doc(data.driverId),
      condition: data.condition,
      odo: data.odo,
    })
    .then(() => {
      return axios.post(
        'https://api.netlify.com/build_hooks/60f41ff453b78473ec19f27c'
      );
    });
});

exports.createPublicProfile = functions.https.onCall(async (data, context) => {
  checkAuthentication(context);
  dataValidator(data, {
    username: 'string',
  });

  const userProfile = await admin
    .firestore()
    .collection('publicProfiles')
    .where('userId', '==', context.auth.uid)
    .limit(1)
    .get();
  if (!userProfile.empty) {
    throw new functions.https.HttpsError(
      'already-exists',
      'This user already has a profile.'
    );
  }

  const publicProfile = await admin
    .firestore()
    .collection('publicProfiles')
    .doc(data.username)
    .get();

  if (publicProfile.exists) {
    throw new functions.https.HttpsError(
      'already-exists',
      'This username exist, please pick unique one.'
    );
  }

  const user = await admin.auth().getUser(context.auth.uid);
  if (user.email === functions.config().accounts.admin) {
    await admin.auth().setCustomUserClaims(context.auth.uid, {admin: true});
  }

  return admin.firestore().collection('publicProfiles').doc(data.username).set({
    userId: context.auth.uid,
  });
});

exports.postComment = functions.https.onCall(async (data, context) => {
  checkAuthentication(context);
  dataValidator(data, {
    truckId: 'string',
    text: 'string',
  });
  const db = admin.firestore();
  const snapshot = await db
    .collection('publicProfiles')
    .where('userId', '==', context.auth.uid)
    .limit(1)
    .get();

  await db.collection('detailsAndComments').add({
    text: data.text,
    username: snapshot.docs[0].id,
    dateCreated: new Date(),
    truck: db.collection('trucks').doc(data.truckId),
  });
});

// https://firebase.google.com/docs/reference/functions/providers_https_#functionserrorcode

function dataValidator(data, validKeys) {
  if (Object.keys(data).length !== Object.keys(validKeys).length) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid amount of properties'
    );
  } else {
    for (const key in data) {
      if (!validKeys[key] || typeof data[key] !== validKeys[key]) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Data object contains invalid properties'
        );
      }
    }
  }
}

function checkAuthentication(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Please sign in first'
    );
  } else if (!context.auth.token.admin && admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Admin permissions required'
    );
  }
}
