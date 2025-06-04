const { Filter } = require("firebase-admin/firestore");
const { notificationDb, notificationDeleteDb } = require("../utils/firebase");
const { formatCreatedAt } = require("../utils/time");

module.exports = class NotificationController {
    static async findAll(req, res) {
        try {
            const { user } = req

            let data = []
            if (user.role == 'user') {
                // Get deleted notifications first
                const notificationDelete = await notificationDeleteDb
                    .where('userId', '==', user.id)
                    .get();

                const deletedIds = notificationDelete.docs.map((d) => {
                    return d.data().notificationId
                });

                // Run the OR query without 'not-in'
                const snapshot = await notificationDb
                    .where(Filter.or(
                        Filter.where('isGlobal', '==', true),
                        Filter.where('userId', '==', user.id)
                    ))
                    .get();

                // Manually filter out deleted notifications
                data = snapshot.docs
                    .filter(doc => !deletedIds.includes(doc.id))
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        createdAt: formatCreatedAt(doc.data(), 'createdAt')
                    }));
            }
            return res.status(200).json({ data })
        } catch (error) {
            console.log(error);
            return res.status(500).json({ error })
        }
    }

    static async delete(req, res) {
        try {
            const { user, params } = req
            const { id } = params
            const payload = {
                notificationId: id,
                userId: user.id
            }
            await notificationDeleteDb.add(payload)
            return res.status(200).json({ data: 'success' })
        } catch (error) {
            console.log(error);
            return res.status(500).json({ error })
        }
    }
}