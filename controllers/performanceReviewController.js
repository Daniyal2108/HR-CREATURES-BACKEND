const PerformanceReview = require('../models/performanceReviewModel');
const Employee = require('../models/employeeModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Create performance review
exports.createPerformanceReview = catchAsync(async (req, res, next) => {
  const {
    employeeId,
    reviewPeriod,
    ratings,
    strengths,
    areasForImprovement,
    goals,
    comments,
  } = req.body;
  const { user } = req;

  if (!employeeId || !reviewPeriod || !ratings) {
    return next(new AppError('Employee ID, review period, and ratings are required', 400));
  }

  const employee = await Employee.findOne({ _id: employeeId, hr: user._id });
  if (!employee) {
    return next(new AppError('Employee not found', 404));
  }

  // Calculate overall rating (average of all ratings)
  const ratingValues = Object.values(ratings).filter((v) => typeof v === 'number');
  const overallRating =
    ratingValues.length > 0
      ? ratingValues.reduce((sum, val) => sum + val, 0) / ratingValues.length
      : 0;

  const review = await PerformanceReview.create({
    employee: employeeId,
    hr: user._id,
    reviewedBy: user._id,
    reviewPeriod,
    ratings,
    overallRating: Math.round(overallRating * 100) / 100,
    strengths,
    areasForImprovement,
    goals,
    comments,
    status: 'Draft',
  });

  res.status(201).json({
    status: 'success',
    data: review,
  });
});

// Get all performance reviews
exports.getAllPerformanceReviews = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 15;
  const skip = (page - 1) * limit;
  const { noPagination, employeeId, status } = req.query;
  const { user } = req;

  let query = { hr: user._id };

  if (employeeId) {
    query.employee = employeeId;
  }

  if (status) {
    query.status = status;
  }

  const doc =
    noPagination && noPagination == 'true'
      ? await PerformanceReview.find(query)
          .populate([
            { path: 'employee', select: 'firstName lastName email employeeId designation' },
            { path: 'reviewedBy', select: 'firstName lastName' },
          ])
          .sort('-reviewDate')
      : await PerformanceReview.find(query)
          .populate([
            { path: 'employee', select: 'firstName lastName email employeeId designation' },
            { path: 'reviewedBy', select: 'firstName lastName' },
          ])
          .sort('-reviewDate')
          .skip(skip)
          .limit(limit);

  const totalCount = await PerformanceReview.countDocuments(query);

  res.status(200).json({
    status: 'success',
    totalCount,
    data: doc,
  });
});

// Get single performance review
exports.getPerformanceReview = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  const review = await PerformanceReview.findOne({ _id: id, hr: user._id }).populate([
    { path: 'employee' },
    { path: 'reviewedBy', select: 'firstName lastName' },
  ]);

  if (!review) {
    return next(new AppError('Performance review not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: review,
  });
});

// Update performance review
exports.updatePerformanceReview = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  // Recalculate overall rating if ratings are updated
  if (req.body.ratings) {
    const ratingValues = Object.values(req.body.ratings).filter((v) => typeof v === 'number');
    if (ratingValues.length > 0) {
      req.body.overallRating =
        Math.round(
          (ratingValues.reduce((sum, val) => sum + val, 0) / ratingValues.length) * 100
        ) / 100;
    }
  }

  const review = await PerformanceReview.findOneAndUpdate(
    { _id: id, hr: user._id },
    req.body,
    {
      new: true,
      runValidators: true,
    }
  ).populate([
    { path: 'employee' },
    { path: 'reviewedBy', select: 'firstName lastName' },
  ]);

  if (!review) {
    return next(new AppError('Performance review not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: review,
  });
});

// Delete performance review
exports.deletePerformanceReview = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  const review = await PerformanceReview.findOneAndDelete({ _id: id, hr: user._id });

  if (!review) {
    return next(new AppError('Performance review not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Performance review deleted successfully',
    data: review,
  });
});

// Complete performance review
exports.completePerformanceReview = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  const review = await PerformanceReview.findOneAndUpdate(
    { _id: id, hr: user._id },
    {
      status: 'Completed',
    },
    { new: true }
  ).populate([{ path: 'employee' }, { path: 'reviewedBy' }]);

  if (!review) {
    return next(new AppError('Performance review not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Performance review completed',
    data: review,
  });
});

