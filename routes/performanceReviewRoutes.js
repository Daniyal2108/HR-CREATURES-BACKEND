const express = require('express');
const { protect, restrictTo } = require('../controllers/authController');
const {
  createPerformanceReview,
  getAllPerformanceReviews,
  getPerformanceReview,
  updatePerformanceReview,
  deletePerformanceReview,
  completePerformanceReview,
} = require('../controllers/performanceReviewController');

const router = express.Router();

// All routes are protected and restricted to HR
router.use(protect, restrictTo('hr'));

// Create performance review
router.route('/').post(createPerformanceReview).get(getAllPerformanceReviews);

// Complete review
router.route('/:id/complete').patch(completePerformanceReview);

// Get single review, update, delete
router
  .route('/:id')
  .get(getPerformanceReview)
  .patch(updatePerformanceReview)
  .delete(deletePerformanceReview);

module.exports = router;

