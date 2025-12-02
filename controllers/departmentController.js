const Department = require('../models/departmentModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { deleteFile } = require('../utils/s3');

exports.getAllDepartments = catchAsync(async (req, res, next) => {
  // for pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 15;
  const skip = (page - 1) * limit;
  const { noPagination} = req.query;
  const {user}=req;

  const doc =
    noPagination && noPagination == 'true'
      ? await Department.find({user:user?._id}).sort('name')
      : await Department.find({user:user?._id})
          .sort('name')
          .skip(skip)
          .limit(limit);

  res.status(200).json({
    status: 'success',
    data: doc,
  });
});

exports.addDepartment = catchAsync(async (req, res, next) => {
  const {user}=req;
  req.body.user=user?._id;
  const doc = await Department.create(req.body);

  res.status(201).json({
    status: 'success',
    data:doc,
  });
});

exports.updateDepartment = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const doc = await Department.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  res.status(200).json({
    status: 'success',
    data: doc,
  });
});

exports.deleteDepartment = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const department=await Department.findByIdAndDelete(id);

  res.status(200).json({
    status: 'success',
    data:department
  });
});

exports.getAllDepartmentsForHr = catchAsync(async (req, res, next) => {
  // for pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 15;
  const skip = (page - 1) * limit;
  const { noPagination} = req.query;

  const doc =
    noPagination && noPagination == 'true'
      ? await Department.find().sort('name')
      : await Department.find()
          .sort('name')
          .skip(skip)
          .limit(limit);

  const totalCount = await Department.countDocuments();

  res.status(200).json({
    status: 'success',
    totalCount,
    data: doc,
  });
});
