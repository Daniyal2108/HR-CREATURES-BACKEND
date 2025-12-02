const express = require('express');

const {
    getVacancyResults,
    generateResult,
    submit
} = require('../controllers/resultController');
const { uploadUserImage } = require('../utils/s3');

const router = express.Router();

//get results of a vacancy through vacancy id
router
    .route('/:id')
    .get(getVacancyResults)

//generating result of a candidate    
router
    .route('/generate/:id')
    .post(uploadUserImage,generateResult);

router
    .route('/submit/:id')
    .patch(submit);

module.exports = router;
