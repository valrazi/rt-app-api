const admin = require('firebase-admin')
const serviceAcc = require('../firebase_key.json')

admin.initializeApp({
    credential: admin.credential.cert(serviceAcc)
})

const userDb = admin.firestore().collection('users')
const tagihanDb = admin.firestore().collection('tagihan')
const tagihanUserDb = admin.firestore().collection('tagihan_user')
const fcmTokenDb = admin.firestore().collection('fcm_token')
const notificationDb = admin.firestore().collection('notification')
const notificationDeleteDb = admin.firestore().collection('notification_delete')
module.exports = {
    admin,
    userDb,
    tagihanDb,
    tagihanUserDb,
    fcmTokenDb,
    notificationDb,
    notificationDeleteDb
}