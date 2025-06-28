const dayjs = require("dayjs");
const { tagihanDb, tagihanUserDb, notificationDb, fcmTokenDb, admin } = require("../utils/firebase");
const TagihanService = require("../services/tagihan");
const { formatCreatedAt } = require("../utils/time");
// const sharp = require('sharp');
const { create } = require("../utils/imgur");

module.exports = class TagihanController {
    static async create(req, res) {
        try {
            const { body } = req
            const { items, tagihanDate } = body
            let totalPrice = 0;
            items.forEach((i) => {
                totalPrice += i.price
            })
            const payload = {
                items,
                tagihanDate: dayjs(tagihanDate).toDate(),
                totalPrice
            }
            const data = await tagihanDb.add(payload)
            const payloadNotification = {
                tagihanId: data.id,
                forRole: 'user',
                isGlobal: true,
                createdAt: dayjs().toDate(),
                type: 'created',
                title: 'Tagihan Baru',
                message: `Tagihan Baru untuk bulan ${dayjs(tagihanDate).format('MMMM')} sudah terbit`
            }

            await notificationDb.add(payloadNotification)
            const snapshotToken = await fcmTokenDb.get()

            const tokens = snapshotToken.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }))

            console.log(tokens);
            const notificationData = {
                title: payloadNotification.title,
                body: payloadNotification.message
            }


            const promises = tokens.map(t => {
                console.log('Send Notif to:' + t);
                return admin.messaging().send({
                    token: t.fcmToken,
                    android: {
                        priority: 'high'
                    },
                    data: notificationData,
                    notification: {
                        title: 'Tagihan Baru',
                        body: 'Ada tagihan baru nih, dicek dulu yuk'
                    }
                })
            })

            const promise = await Promise.allSettled(promises)
            console.log(promise);

            return res.status(201).json({
                data
            })
        } catch (error) {
            console.log(error);
            return res.status(500).json({ error })
        }
    }

    static async findAll(req, res) {
        try {
            const { user } = req
            let snapshot = await tagihanDb.orderBy('tagihanDate', 'asc').get()
            if (snapshot.empty) {
                return []
            }

            let tagihan = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                tagihanDate: formatCreatedAt(doc.data(), 'tagihanDate'),
            }))



            if (user.role == 'user') {
                snapshot = await tagihanUserDb.where('userId', '==', user.id).get()
                tagihan = tagihan.map((t) => {
                    return {
                        ...t,
                        isPaid: false
                    }
                })
                let latestTagihanUnpaid;
                let latestTagihanPaid;

                let tagihanPaidIndex = -1
                if (!snapshot.empty) {
                    snapshot.docs.forEach((d) => {
                        const data = d.data()
                        const isPaid = tagihan.findIndex((t) => t.id == data.tagihan.id)
                        if (isPaid != -1) {
                            // tagihan.splice(isPaid, 1)
                            tagihan[isPaid].isPaid = true
                        }
                    })

                    for (const t of tagihan) {
                        if (t.isPaid) {
                            latestTagihanPaid = t;
                        } else {
                            latestTagihanUnpaid = t;
                            break;
                        }
                    }

                }
                if(!latestTagihanPaid) latestTagihanPaid = tagihan[0]
                
                if(!latestTagihanUnpaid) latestTagihanUnpaid = tagihan[0]
                tagihan = [latestTagihanPaid, latestTagihanUnpaid]
            }

            return res.status(200).json({
                data: tagihan
            })
        } catch (error) {
            console.log(error);
            return res.status(500).json({ error })
        }
    }

    static async findOne(req, res) {
        try {
            const { params } = req
            const { id } = params
            const tagihan = await TagihanService.findOneById(id)
            console.log({ tagihan });
            if (!tagihan) {
                return res.status(404).json({
                    error: 'data not found'
                })
            }
            tagihan.tagihanDate = formatCreatedAt(tagihan, 'tagihanDate')
            return res.status(200).json({
                data: tagihan
            })
        } catch (error) {
            console.log(error);
            return res.status(500).json({ error })
        }
    }

    static async pay(req, res) {
        try {
            const { body, user } = req
            const { tagihanId, description } = body
            let { images } = body
            images = Array.isArray(images) ? images : [images];
            const tagihan = await TagihanService.findOneById(tagihanId)
           

            const imgLink = await create(images[0])

            const userInfo =
            {
                date: dayjs().toDate(),
                transferProof: [imgLink],
                description
            }
            const payload = {
                tagihan,
                userInfo: [userInfo],
                status: 'processing',
                userId: user.id,
                adminReply: [],
                paidAt: dayjs().toDate()
            }

            const tagihanUser = await tagihanUserDb.add(payload)

            return res.status(201).json({
                data: tagihanUser
            })
        } catch (error) {
            console.log(error);
            return res.status(500).json({ error })
        }
    }

    static async findAllTagihanUser(req, res) {
        try {
            const { user } = req
            const statuses = ['processing', 'need_to_fix'];
            let snapshot = user.role == 'user' ? await tagihanUserDb.where('status', 'in', statuses).where('userId', '==', user.id).get() : await tagihanUserDb.where('status', 'in', statuses).get()

            let tagihan = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                paidAt: formatCreatedAt(doc.data(), 'paidAt')
            }))

            tagihan = tagihan.map((t) => {
                t.tagihan.tagihanDate = formatCreatedAt(t.tagihan, 'tagihanDate')
                t.userInfo = t.userInfo.map((tu) => {
                    tu.date = formatCreatedAt(tu, 'date')
                    return tu
                })
                t.adminReply = t.adminReply.map((tu) => {
                    tu.date = formatCreatedAt(tu, 'date')
                    return tu
                })
                return t
            })

            console.log(tagihan);
            res.status(200).json({
                data: tagihan
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                error
            })
        }
    }

    static async findOneTagihanUser(req, res) {
        try {
            const { params } = req
            const { id } = params
            const tagihan = await TagihanService.findTagihanUserOneById(id)
            console.log({ tagihan });
            if (!tagihan) {
                return res.status(404).json({
                    error: 'data not found'
                })
            }
            return res.status(200).json({
                data: tagihan
            })
        } catch (error) {
            console.log(error);
            return res.status(500).json({ error })
        }
    }

    static async updateTagihanUser(req, res) {
        try {
            const { params, body } = req
            const { id } = params
            const { status, description } = body
            const { images } = body
            let imagesAdmin = [];

            const tagihan = await TagihanService.findTagihanUserOneById(id)
            if (!tagihan) {
                return res.status(404).json({
                    error: 'data not found'
                })
            }

            let adminReply = tagihan.adminReply
            const adminReplyPayload = {
                description: description ?? null,
                images: imagesAdmin,
                date: dayjs().toDate()
            }
            if (images) {
                imagesAdmin = images && Array.isArray(images) ? images : [images];
                adminReplyPayload.images = imagesAdmin
            }
            if (description) {
                adminReplyPayload.note = description
            }

            adminReply = [adminReplyPayload]

            await tagihanUserDb.doc(id).update({
                status,
                adminReply
            })

            return res.status(200).json({
                data: 'success'
            })
        } catch (error) {
            console.log(error);
            return res.status(500).json({ error })
        }
    }

    static async updateTagihanUserByUser(req, res) {
        try {
            const { params, body } = req
            const { id } = params
            const { description } = body
            let { images } = body
            images = Array.isArray(images) ? images : [images];


           
            const imgLink = await create(images[0])

            const userInfo =
            {
                date: dayjs().toDate(),
                transferProof: [imgLink],
                description
            }

            const tagihan = await TagihanService.findTagihanUserOneById(id)
            if (!tagihan) {
                return res.status(404).json({
                    error: 'data not found'
                })
            }

            await tagihanUserDb.doc(id).update({
                userInfo: [...tagihan.userInfo, userInfo],
                status: 'processing'
            })

            return res.status(200).json({
                data: 'success'
            })
        } catch (error) {
            console.log(error);
            return res.status(500).json({ error })
        }
    }

    static async findAllTagihanUserHistory(req, res) {
        try {
            const { user, query } = req
            const { month } = query
            const statuses = ['verified'];
            let snapshot = user.role == 'user' ? await tagihanUserDb.where('status', 'in', statuses).where('userId', '==', user.id).get() : await tagihanUserDb.where('status', 'in', statuses).get()

            let tagihan = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                paidAt: formatCreatedAt(doc.data(), 'paidAt')
            }))

            if (month) {
                tagihan = tagihan.filter((t) => {
                    const tagihanMonth = dayjs(t.tagihanDate).format('MMMM');
                    return tagihanMonth.toLowerCase() === month.toLowerCase();
                });
            }

            tagihan = tagihan.map((t) => {
                t.tagihan.tagihanDate = formatCreatedAt(t.tagihan, 'tagihanDate')
                if (t.userInfo.length) {
                    const tempUserInfo = t.userInfo[t.userInfo.length - 1]
                    tempUserInfo.date = formatCreatedAt(tempUserInfo, 'date')
                    t.userInfo = [tempUserInfo]
                }

                if (t.adminReply.length) {
                    const tempAdminReply = t.adminReply[t.adminReply.length - 1]
                    tempAdminReply.date = formatCreatedAt(tempAdminReply, 'date')
                    t.adminReply = [tempAdminReply]
                }

                return t
            })

            console.log(tagihan);
            res.status(200).json({
                data: tagihan
            })

        } catch (error) {
            console.log(error);
            res.status(500).json({ error })
        }
    }
}