const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');
const {
  protect,
} = require('../controllers/authController');

const { uploadUserImage } = require('../utils/s3');

const router = express.Router();

//dynamic api for signup
router.post('/signup', authController.signup);

//dynamic api for login
router.post('/login', authController.login);

//admin login route
router.post('/admin-login', authController.adminLogin);

//user forgot password route
router.post('/forgotPassword', authController.forgotPassword);

//user reset password route
router.patch('/reset-password', authController.resetPasswordDone);

//user create password done
router.post('/createPasswordDone', authController.createPasswordDone);

//getting user detail
router.route('/detail/:id').get(userController.getSpecificUserDetails);

// Protect all routes after this middleware with token
router.use(protect);

//user getting logged out
router.post('/logout', authController.logout);

//user updates his password
router.patch('/updateMyPassword', authController.updatePassword);

//user updates his profile
router.patch('/updateMe', uploadUserImage, userController.updateMe);

//user gets himself through his token
router.get('/me', userController.getMe, userController.getUser);

module.exports = router;
