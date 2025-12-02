const express = require('express');
const { protect, restrictTo } = require('../controllers/authController');
const { uploadUserImage } = require('../utils/s3');
const {
  uploadDocument,
  getAllDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  getEmployeeDocuments,
} = require('../controllers/employeeDocumentController');

const router = express.Router();

// All routes are protected and restricted to HR
router.use(protect, restrictTo('hr'));

// Upload document
router.route('/upload').post(uploadUserImage, uploadDocument);

// Get documents by employee
router.route('/employee/:employeeId').get(getEmployeeDocuments);

// Get all documents
router.route('/').get(getAllDocuments);

// Get single document, update, delete
router
  .route('/:id')
  .get(getDocument)
  .patch(updateDocument)
  .delete(deleteDocument);

module.exports = router;

