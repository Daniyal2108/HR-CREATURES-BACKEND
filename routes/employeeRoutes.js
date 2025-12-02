const express = require('express');
const { protect, restrictTo } = require('../controllers/authController');
const {
  convertToEmployee,
  getAllEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeStatistics,
  bulkConvertToEmployee,
} = require('../controllers/employeeController');

const router = express.Router();

// All routes are protected and restricted to HR
router.use(protect, restrictTo('hr'));

// Statistics
router.route('/statistics').get(getEmployeeStatistics);

// Convert candidate to employee
router.route('/convert').post(convertToEmployee);

// Bulk convert
router.route('/bulk-convert').post(bulkConvertToEmployee);

// Get all employees
router.route('/').get(getAllEmployees);

// Get single employee, update, delete
router
  .route('/:id')
  .get(getEmployee)
  .patch(updateEmployee)
  .delete(deleteEmployee);

module.exports = router;

