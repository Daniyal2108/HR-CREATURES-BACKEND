const express = require('express');
const { protect, restrictTo } = require('../controllers/authController');

const {
  createVacancyTemplate,
  updateVacancyTemplate,
  deleteVacancyTemplate,
  getMyVacancyTemplates,
  getVacancyTemplateDetail
} = require('../controllers/vacancyTemplateController');

const router = express.Router();

router.use(protect,restrictTo('hr'))

router
  .route('/')
  .post(createVacancyTemplate);

  router
  .route('/my-templates')
  .get(getMyVacancyTemplates)

router
  .route('/:id')
  .patch(updateVacancyTemplate)
  .delete(deleteVacancyTemplate);

  router
  .route('/detail/:id')
  .get(getVacancyTemplateDetail)

module.exports = router;
