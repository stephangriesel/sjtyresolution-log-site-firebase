const functions = require("firebase-functions");
const admin = require("firebase-admin");

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

admin.initializeApp();

exports.postComment = functions.https.onCall(async (data, context) => {
  checkAuthentication(context);
  dataValidator(data, {
    truckId: 'string',
    text: 'string'
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
    book: db.collection('trucks').doc(data.tru)
  });
});
