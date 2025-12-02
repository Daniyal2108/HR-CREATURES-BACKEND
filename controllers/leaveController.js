const Leave = require('../models/leaveModel');
const Employee = require('../models/employeeModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const moment = require('moment');

// Apply for leave (by HR on behalf of employee or employee themselves)
exports.applyLeave = catchAsync(async (req, res, next) => {
  const { employeeId, leaveType, startDate, endDate, reason } = req.body;
  const { user } = req;

  if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
    return next(new AppError('All fields are required', 400));
  }

  // Check if employee exists and belongs to HR
  const employee = await Employee.findOne({ _id: employeeId, hr: user._id });
  if (!employee) {
    return next(new AppError('Employee not found', 404));
  }

  // Calculate total days
  const start = moment(startDate);
  const end = moment(endDate);
  const totalDays = end.diff(start, 'days') + 1;

  if (totalDays <= 0) {
    return next(new AppError('End date must be after start date', 400));
  }

  const leave = await Leave.create({
    employee: employeeId,
    hr: user._id,
    leaveType,
    startDate,
    endDate,
    totalDays,
    reason,
    status: 'Pending',
  });

  res.status(201).json({
    status: 'success',
    data: leave,
  });
});

// Get all leaves
exports.getAllLeaves = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 15;
  const skip = (page - 1) * limit;
  const { noPagination, status, employeeId, startDate, endDate } = req.query;
  const { user } = req;

  let query = { hr: user._id };

  if (status) {
    query.status = status;
  }

  if (employeeId) {
    query.employee = employeeId;
  }

  if (startDate && endDate) {
    query.$and = [
      { startDate: { $lte: new Date(endDate) } },
      { endDate: { $gte: new Date(startDate) } },
    ];
  } else if (startDate) {
    query.endDate = { $gte: new Date(startDate) };
  } else if (endDate) {
    query.startDate = { $lte: new Date(endDate) };
  }

  const doc =
    noPagination && noPagination == 'true'
      ? await Leave.find(query)
          .populate([
            { path: 'employee', select: 'firstName lastName email employeeId' },
            { path: 'approvedBy', select: 'firstName lastName' },
          ])
          .sort('-createdAt')
      : await Leave.find(query)
          .populate([
            { path: 'employee', select: 'firstName lastName email employeeId' },
            { path: 'approvedBy', select: 'firstName lastName' },
          ])
          .sort('-createdAt')
          .skip(skip)
          .limit(limit);

  const totalCount = await Leave.countDocuments(query);

  res.status(200).json({
    status: 'success',
    totalCount,
    data: doc,
  });
});

// Get single leave
exports.getLeave = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  const leave = await Leave.findOne({ _id: id, hr: user._id }).populate([
    { path: 'employee' },
    { path: 'approvedBy', select: 'firstName lastName' },
  ]);

  if (!leave) {
    return next(new AppError('Leave not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: leave,
  });
});

// Approve leave
exports.approveLeave = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  const leave = await Leave.findOneAndUpdate(
    { _id: id, hr: user._id, status: 'Pending' },
    {
      status: 'Approved',
      approvedBy: user._id,
      approvedAt: new Date(),
    },
    { new: true }
  ).populate([{ path: 'employee' }, { path: 'approvedBy' }]);

  if (!leave) {
    return next(new AppError('Leave not found or already processed', 404));
  }

  // Update employee status if leave is approved
  if (leave.status === 'Approved') {
    const today = new Date();
    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);

    if (today >= startDate && today <= endDate) {
      await Employee.findByIdAndUpdate(leave.employee._id, {
        employmentStatus: 'On Leave',
      });
    }
  }

  res.status(200).json({
    status: 'success',
    message: 'Leave approved successfully',
    data: leave,
  });
});

// Reject leave
exports.rejectLeave = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { rejectionReason } = req.body;
  const { user } = req;

  const leave = await Leave.findOneAndUpdate(
    { _id: id, hr: user._id, status: 'Pending' },
    {
      status: 'Rejected',
      approvedBy: user._id,
      approvedAt: new Date(),
      rejectionReason: rejectionReason || 'No reason provided',
    },
    { new: true }
  ).populate([{ path: 'employee' }, { path: 'approvedBy' }]);

  if (!leave) {
    return next(new AppError('Leave not found or already processed', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Leave rejected',
    data: leave,
  });
});

// Update leave
exports.updateLeave = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  // Recalculate total days if dates are updated
  if (req.body.startDate || req.body.endDate) {
    const leave = await Leave.findById(id);
    const startDate = req.body.startDate || leave.startDate;
    const endDate = req.body.endDate || leave.endDate;
    const start = moment(startDate);
    const end = moment(endDate);
    req.body.totalDays = end.diff(start, 'days') + 1;
  }

  const updatedLeave = await Leave.findOneAndUpdate(
    { _id: id, hr: user._id },
    req.body,
    {
      new: true,
      runValidators: true,
    }
  ).populate([{ path: 'employee' }, { path: 'approvedBy' }]);

  if (!updatedLeave) {
    return next(new AppError('Leave not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: updatedLeave,
  });
});

// Delete leave
exports.deleteLeave = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  const leave = await Leave.findOneAndDelete({ _id: id, hr: user._id });

  if (!leave) {
    return next(new AppError('Leave not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Leave deleted successfully',
    data: leave,
  });
});

// Get leave statistics
exports.getLeaveStatistics = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { employeeId, year } = req.query;

  let query = { hr: user._id };
  if (employeeId) {
    query.employee = employeeId;
  }
  if (year) {
    query.startDate = {
      $gte: new Date(`${year}-01-01`),
      $lte: new Date(`${year}-12-31`),
    };
  }

  const totalLeaves = await Leave.countDocuments(query);
  const pendingLeaves = await Leave.countDocuments({ ...query, status: 'Pending' });
  const approvedLeaves = await Leave.countDocuments({ ...query, status: 'Approved' });
  const rejectedLeaves = await Leave.countDocuments({ ...query, status: 'Rejected' });

  // Total leave days
  const leaves = await Leave.find({ ...query, status: 'Approved' });
  const totalLeaveDays = leaves.reduce((sum, leave) => sum + leave.totalDays, 0);

  res.status(200).json({
    status: 'success',
    data: {
      totalLeaves,
      pendingLeaves,
      approvedLeaves,
      rejectedLeaves,
      totalLeaveDays,
    },
  });
});

