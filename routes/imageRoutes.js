const express = require('express');
const {
    getImageKeys,
} = require('../controllers/imageController');

const router = express.Router();

router
  .route('/keys')
  .get(getImageKeys)

module.exports = router;
