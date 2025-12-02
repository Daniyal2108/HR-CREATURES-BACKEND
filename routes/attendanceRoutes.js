const express = require('express');
const { protect, restrictTo } = require('../controllers/authController');
const {
  checkIn,
  checkOut,
  getAllAttendance,
  getAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceStatistics,
} = require('../controllers/attendanceController');

const router = express.Router();

// All routes are protected and restricted to HR
router.use(protect, restrictTo('hr'));

// Statistics
router.route('/statistics').get(getAttendanceStatistics);

// Check-in
router.route('/check-in').post(checkIn);

// Check-out
router.route('/check-out').post(checkOut);

// Get all attendance
router.route('/').get(getAllAttendance);

// Get single attendance, update, delete
router
  .route('/:id')
  .get(getAttendance)
  .patch(updateAttendance)
  .delete(deleteAttendance);

module.exports = router;

