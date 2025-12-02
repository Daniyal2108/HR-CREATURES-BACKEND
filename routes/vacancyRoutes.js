const express = require('express');
const { protect, restrictTo } = require('../controllers/authController');
const { uploadUserImage } = require('../utils/s3');

const {
  getAllVacancies,
  getVacancyData,
  addVacancy,
  updateVacancy,
  deleteVacancy,
  getAllVacanciesForHr,
  statistics
} = require('../controllers/vacancyController');

const router = express.Router();

router
  .route('/statistics')
  .get(protect, restrictTo('hr'), statistics);

router
  .route('/')
  .get(protect, restrictTo('hr'), getAllVacancies)
  .post(protect, uploadUserImage, restrictTo('hr'), addVacancy);

router
  .route('/:id')
  .get(getVacancyData)
  .patch( protect, restrictTo('hr'),updateVacancy)
  .delete( protect, restrictTo('hr'),deleteVacancy);

router
  .route('/all')
  .get(protect, restrictTo('hr'), getAllVacanciesForHr);

module.exports = router;
