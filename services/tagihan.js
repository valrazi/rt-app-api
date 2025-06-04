const { tagihanDb, tagihanUserDb } = require("../utils/firebase");
const { formatCreatedAt } = require("../utils/time");

module.exports = class TagihanService {
    static async findOneById(id) {
        try {
            let tagihan = await tagihanDb.doc(id).get()
            console.log({tagihan});
            if(!tagihan.exists) {
                return null
            }
            tagihan = {
                id: tagihan.id,
                ...tagihan.data()
            }
            return tagihan
        } catch (error) {
            return null
        }
    }

    static async findTagihanUserOneById(id) {
        try {
            let tagihan = await tagihanUserDb.doc(id).get()
            console.log({tagihan});
            if(!tagihan.exists) {
                return null
            }
            tagihan = {
                id: tagihan.id,
                ...tagihan.data()
            }
            tagihan.paidAt = formatCreatedAt(tagihan, 'paidAt')
            tagihan.tagihan.tagihanDate = formatCreatedAt(tagihan.tagihan, 'tagihanDate')
            tagihan.userInfo.forEach((d) => {
                d.date = formatCreatedAt(d, 'date')
            })
            return tagihan
        } catch (error) {
            return null
        }
    }
}