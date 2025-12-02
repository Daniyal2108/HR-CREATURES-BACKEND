const express = require('express');
const { protect, restrictTo } = require('../controllers/authController');
const {
  getHRDashboard,
  getEmployeeSummary,
  getDepartmentReports,
} = require('../controllers/hrReportsController');

const router = express.Router();

// All routes are protected and restricted to HR
router.use(protect, restrictTo('hr'));

// HR Dashboard
router.route('/dashboard').get(getHRDashboard);

// Employee Summary
router.route('/employee/:employeeId').get(getEmployeeSummary);

// Department Reports
router.route('/departments').get(getDepartmentReports);

module.exports = router;

