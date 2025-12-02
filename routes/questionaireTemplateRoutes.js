const express = require('express');
const { protect, restrictTo } = require('../controllers/authController');

const {
  createQuestionaire,
  updateQuestionaire,
  deleteQuestionaire,
  getMyQuestionaireTemplates,
  getQuestionaireTemplateDetail
} = require('../controllers/questionaireTemplateController');

const router = express.Router();

router.use(protect,restrictTo('hr'))

router
  .route('/')
  .post(createQuestionaire);

  router
  .route('/my-templates')
  .get(getMyQuestionaireTemplates)

router
  .route('/:id')
  .patch(updateQuestionaire)
  .delete(deleteQuestionaire);

  router
  .route('/detail/:id')
  .get(getQuestionaireTemplateDetail)

module.exports = router;
