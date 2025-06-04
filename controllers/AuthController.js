const bcrypt = require('bcrypt')
const AuthUtils = require("../utils/auth")
const logger = require("../utils/logger")
const { userDb, fcmTokenDb } = require('../utils/firebase')
const UserService = require('../services/user')
const dayjs = require('dayjs')
const { formatCreatedAt } = require('../utils/time')
module.exports = class AuthController {
    static async signUp(req, res) {
        try {
            const { body } = req
            const { email, password, name } = body
            const payload = {
                email,
                password: bcrypt.hashSync(password, 10),
                name,
                role: 'user',
                createdAt: new Date()
            }
            const userExistSnapshot = await userDb.where('email', '==', email).get()
            if (!userExistSnapshot.empty) {
                return res.status(400).json({ error: 'Account with the same email already exist' })
            }
            const user = await userDb.add(payload)
            return res.status(201).json({
                data: user
            })
        } catch (error) {
            return res.status(500).json({ error })
        }
    }

    static async login(req, res) {
        const { body } = req
        const { email, password, fcmToken } = body
        try {
            const user = await UserService.findOneByEmail(email)
            if (!user || !(await bcrypt.compare(password, user.password))) {
                return res.status(400)
                    .json({
                        error: 'Invalid account'
                    })
            }
            if (fcmToken) {
                await fcmTokenDb.add({
                    userId: user.id,
                    fcmToken
                })
            }
            delete user.password
            user.createdAt = formatCreatedAt(user)
            return res.status(200)
                .json({
                    data: {
                        token: AuthUtils.encodeToken(user.id),
                        user
                    }
                })
        } catch (error) {
            console.log(error);
            return res.status(500)
                .json({
                    error
                })
        }
    }

    static async me(req, res) {
        const { user } = req
        try {
            return res.status(200)
                .json({ user })
        } catch (error) {
            logger.error(error)
            return res.status(500)
                .json({ error })
        }
    }
}