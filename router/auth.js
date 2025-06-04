const express = require('express')
const Controller = require('../controllers/AuthController')
const validator = require('express-validator')
const authenticated = require('../middlewares/auth')
const router = express.Router()
const payloadValidation = require('../middlewares/payload-validation')
const {body} = require('express-validator')


router.post('/register', [
    body('email').notEmpty().withMessage('Email required').isEmail().withMessage('Email not valid'),
    body('password').notEmpty().withMessage('Password required'),
    body('name').notEmpty().withMessage('name required')
], payloadValidation, Controller.signUp)

router.post('/login', [
    body('email').notEmpty().withMessage('Email required').isEmail().withMessage('Email not valid'),
    body('password').notEmpty().withMessage('Password required')
], payloadValidation, Controller.login)


router.use(authenticated)
router.get('/me', Controller.me)
module.exports = router