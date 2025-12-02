const express = require('express');
const { protect, restrictTo } = require('../controllers/authController');
const { uploadUserImage } = require('../utils/s3');

const {
  getAllDepartments,
  addDepartment,
  updateDepartment,
  deleteDepartment,
  getAllDepartmentsForHr,
} = require('../controllers/departmentController');

const router = express.Router();

router
  .route('/')
  .get(protect,getAllDepartments)
  .post(protect, restrictTo('hr'),addDepartment);

router
  .route('/:id', protect, restrictTo('hr'))
  .patch(updateDepartment)
  .delete(deleteDepartment);

router
  .route('/all')
  .get(protect, restrictTo('hr'), getAllDepartmentsForHr);

module.exports = router;
