const EmployeeDocument = require('../models/employeeDocumentModel');
const Employee = require('../models/employeeModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { deleteFile } = require('../utils/s3');
const moment = require('moment');

// Upload employee document
exports.uploadDocument = catchAsync(async (req, res, next) => {
  const { employeeId, documentType, documentName, expiryDate, notes } = req.body;
  const { user } = req;
  const files = req.files;

  if (!employeeId || !documentType || !documentName) {
    return next(new AppError('Employee ID, document type, and document name are required', 400));
  }

  const employee = await Employee.findOne({ _id: employeeId, hr: user._id });
  if (!employee) {
    return next(new AppError('Employee not found', 404));
  }

  if (!files || !files.document || !files.document[0]) {
    return next(new AppError('Document file is required', 400));
  }

  const file = files.document[0];
  const fileUrl = file.key;
  const fileName = file.originalname;
  const fileSize = file.size;

  // Check if document is expired
  let isExpired = false;
  if (expiryDate) {
    isExpired = moment(expiryDate).isBefore(moment());
  }

  const document = await EmployeeDocument.create({
    employee: employeeId,
    hr: user._id,
    documentType,
    documentName,
    fileUrl,
    fileName,
    fileSize,
    uploadedBy: user._id,
    expiryDate: expiryDate || undefined,
    isExpired,
    notes: notes || undefined,
  });

  res.status(201).json({
    status: 'success',
    message: 'Document uploaded successfully',
    data: document,
  });
});

// Get all employee documents
exports.getAllDocuments = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 15;
  const skip = (page - 1) * limit;
  const { noPagination, employeeId, documentType } = req.query;
  const { user } = req;

  let query = { hr: user._id };

  if (employeeId) {
    query.employee = employeeId;
  }

  if (documentType) {
    query.documentType = documentType;
  }

  const doc =
    noPagination && noPagination == 'true'
      ? await EmployeeDocument.find(query)
          .populate({ path: 'employee', select: 'firstName lastName email employeeId' })
          .populate({ path: 'uploadedBy', select: 'firstName lastName' })
          .sort('-uploadedAt')
      : await EmployeeDocument.find(query)
          .populate({ path: 'employee', select: 'firstName lastName email employeeId' })
          .populate({ path: 'uploadedBy', select: 'firstName lastName' })
          .sort('-uploadedAt')
          .skip(skip)
          .limit(limit);

  const totalCount = await EmployeeDocument.countDocuments(query);

  res.status(200).json({
    status: 'success',
    totalCount,
    data: doc,
  });
});

// Get single document
exports.getDocument = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  const document = await EmployeeDocument.findOne({ _id: id, hr: user._id }).populate([
    { path: 'employee' },
    { path: 'uploadedBy', select: 'firstName lastName' },
  ]);

  if (!document) {
    return next(new AppError('Document not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: document,
  });
});

// Update document
exports.updateDocument = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  // Check if document is expired
  if (req.body.expiryDate) {
    req.body.isExpired = moment(req.body.expiryDate).isBefore(moment());
  }

  const document = await EmployeeDocument.findOneAndUpdate(
    { _id: id, hr: user._id },
    req.body,
    {
      new: true,
      runValidators: true,
    }
  ).populate([{ path: 'employee' }, { path: 'uploadedBy' }]);

  if (!document) {
    return next(new AppError('Document not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: document,
  });
});

// Delete document
exports.deleteDocument = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  const document = await EmployeeDocument.findOne({ _id: id, hr: user._id });

  if (!document) {
    return next(new AppError('Document not found', 404));
  }

  // Delete file from S3
  if (document.fileUrl) {
    try {
      await deleteFile(document.fileUrl);
    } catch (err) {
      console.error('Error deleting file from S3:', err);
    }
  }

  await EmployeeDocument.findByIdAndDelete(id);

  res.status(200).json({
    status: 'success',
    message: 'Document deleted successfully',
    data: document,
  });
});

// Get documents by employee
exports.getEmployeeDocuments = catchAsync(async (req, res, next) => {
  const { employeeId } = req.params;
  const { user } = req;

  const employee = await Employee.findOne({ _id: employeeId, hr: user._id });
  if (!employee) {
    return next(new AppError('Employee not found', 404));
  }

  const documents = await EmployeeDocument.find({
    employee: employeeId,
    hr: user._id,
  })
    .populate({ path: 'uploadedBy', select: 'firstName lastName' })
    .sort('-uploadedAt');

  res.status(200).json({
    status: 'success',
    data: documents,
  });
});

