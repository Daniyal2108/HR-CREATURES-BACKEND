const express = require('express');
const { protect, restrictTo } = require('../controllers/authController');
const {
  applyLeave,
  getAllLeaves,
  getLeave,
  approveLeave,
  rejectLeave,
  updateLeave,
  deleteLeave,
  getLeaveStatistics,
} = require('../controllers/leaveController');

const router = express.Router();

// All routes are protected and restricted to HR
router.use(protect, restrictTo('hr'));

// Statistics
router.route('/statistics').get(getLeaveStatistics);

// Apply for leave
router.route('/apply').post(applyLeave);

// Get all leaves
router.route('/').get(getAllLeaves);

// Get single leave, update, delete
router
  .route('/:id')
  .get(getLeave)
  .patch(updateLeave)
  .delete(deleteLeave);

// Approve leave
router.route('/:id/approve').patch(approveLeave);

// Reject leave
router.route('/:id/reject').patch(rejectLeave);

module.exports = router;

