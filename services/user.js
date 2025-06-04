const { userDb } = require("../utils/firebase")

module.exports = class UserService {
    static async findOneByEmail(email) {
        try {
            let user = await userDb.where('email', '==', email).get()
            if(user.empty) {
                return null
            }
            user = {
                id: user.docs[0].id,
                ...user.docs[0].data()
            }
            return user
        } catch (error) {
            return null
        }
    }

    static async findOneById(id) {
        try {
            let user = await userDb.doc(id).get()

            if(!user.exists) {
                return null
            }
            delete user.password
            user = {
                id: user.id,
                ...user.data()
            }
            return user
        } catch (error) {
            return null
        }
    }
}