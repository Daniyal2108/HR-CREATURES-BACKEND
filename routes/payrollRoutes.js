const express = require('express');
const { protect, restrictTo } = require('../controllers/authController');
const {
  generatePayroll,
  getAllPayrolls,
  getPayroll,
  updatePayroll,
  markAsPaid,
  deletePayroll,
  getPayrollStatistics,
} = require('../controllers/payrollController');

const router = express.Router();

// All routes are protected and restricted to HR
router.use(protect, restrictTo('hr'));

// Statistics
router.route('/statistics').get(getPayrollStatistics);

// Generate payroll
router.route('/generate').post(generatePayroll);

// Mark as paid
router.route('/:id/mark-paid').patch(markAsPaid);

// Get all payrolls
router.route('/').get(getAllPayrolls);

// Get single payroll, update, delete
router
  .route('/:id')
  .get(getPayroll)
  .patch(updatePayroll)
  .delete(deletePayroll);

module.exports = router;

