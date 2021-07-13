const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { user } = require('firebase-functions/lib/providers/auth');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

admin.initializeApp();

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
      'This user already has a public profile.'
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
      'This username already belongs to an existing user.'
    );
  }

  const user = await admin.auth().getUser(context.auth.uid);
  if (user.email === functions.config().accounts.admin) {
    console.log(user.email, functions.config().accounts.admin);
    await admin.auth().setCustomUserClaims(context.auth.uid, { admin: true });
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

function dataValidator(data, validKeys) {
  if (Object.keys(data).length !== Object.keys(validKeys).length) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Data object contains invalid number of properties'
    );
  } else {
    for (let key in data) {
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
      'You must be signed in to use this feature'
    );
  }
}
