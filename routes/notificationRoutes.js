const express = require('express');
const { protect } = require('../controllers/authController');
const {
  seenNotifiation,
  getAllNotificationsForAll,
  notfsCount,
  generateNotification
} = require('../controllers/notificationController');

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

//generate notification
router.route('/generate').post(generateNotification);

//to see all notifications
router.route('/all').get(getAllNotificationsForAll);

//to get all seen notifications
router.route('/seen').get(seenNotifiation);

router.route('/notfsCount').get(notfsCount);

// router.route('/').post(createNotification);
// router.route('/:id').patch(updateNotification).delete(deleteNotification);

module.exports = router;
