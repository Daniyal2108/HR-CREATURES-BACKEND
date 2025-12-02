const Payroll = require('../models/payrollModel');
const Employee = require('../models/employeeModel');
const Attendance = require('../models/attendanceModel');
const Leave = require('../models/leaveModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const moment = require('moment');

// Generate payroll for an employee
exports.generatePayroll = catchAsync(async (req, res, next) => {
  const { employeeId, month, year } = req.body;
  const { user } = req;

  if (!employeeId || !month || !year) {
    return next(new AppError('Employee ID, month, and year are required', 400));
  }

  const employee = await Employee.findOne({ _id: employeeId, hr: user._id });
  if (!employee) {
    return next(new AppError('Employee not found', 404));
  }

  // Check if payroll already exists
  const existingPayroll = await Payroll.findOne({
    employee: employeeId,
    month: parseInt(month),
    year: parseInt(year),
  });

  if (existingPayroll) {
    return next(new AppError('Payroll already generated for this month', 400));
  }

  // Get attendance data for the month
  const startDate = moment(`${year}-${month}-01`).startOf('month').toDate();
  const endDate = moment(`${year}-${month}-01`).endOf('month').toDate();

  const attendances = await Attendance.find({
    employee: employeeId,
    date: { $gte: startDate, $lte: endDate },
  });

  const presentDays = attendances.filter((att) => att.status === 'Present').length;
  const totalWorkingDays = moment(endDate).diff(moment(startDate), 'days') + 1;
  const absentDays = totalWorkingDays - presentDays;

  // Get leave data
  const leaves = await Leave.find({
    employee: employeeId,
    status: 'Approved',
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });

  const leaveDays = leaves.reduce((sum, leave) => {
    const leaveStart = moment.max(moment(leave.startDate), moment(startDate));
    const leaveEnd = moment.min(moment(leave.endDate), moment(endDate));
    return sum + leaveEnd.diff(leaveStart, 'days') + 1;
  }, 0);

  // Calculate overtime
  const totalOvertimeHours = attendances.reduce(
    (sum, att) => sum + (att.overtimeHours || 0),
    0
  );

  // Calculate earnings
  const basicSalary = employee.salary || 0;
  const dailySalary = basicSalary / 30; // Assuming 30 days per month
  const earnedSalary = dailySalary * presentDays;
  const allowances = 0; // Can be configured
  const bonuses = 0; // Can be configured
  const overtimePay = totalOvertimeHours * (dailySalary / 8) * 1.5; // 1.5x for overtime
  const totalEarnings = earnedSalary + allowances + bonuses + overtimePay;

  // Calculate deductions
  const tax = totalEarnings * 0.1; // 10% tax (can be configured)
  const providentFund = basicSalary * 0.12; // 12% PF (can be configured)
  const insurance = 0; // Can be configured
  const leaveDeductions = dailySalary * leaveDays;
  const otherDeductions = 0; // Can be configured
  const totalDeductions = tax + providentFund + insurance + leaveDeductions + otherDeductions;

  // Net salary
  const netSalary = totalEarnings - totalDeductions;

  const payroll = await Payroll.create({
    employee: employeeId,
    hr: user._id,
    month: parseInt(month),
    year: parseInt(year),
    basicSalary,
    allowances,
    bonuses,
    overtime: overtimePay,
    totalEarnings,
    tax,
    providentFund,
    insurance,
    leaveDeductions,
    otherDeductions,
    totalDeductions,
    netSalary,
    status: 'Generated',
  });

  res.status(201).json({
    status: 'success',
    message: 'Payroll generated successfully',
    data: payroll,
  });
});

// Get all payroll records
exports.getAllPayrolls = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 15;
  const skip = (page - 1) * limit;
  const { noPagination, employeeId, month, year, status } = req.query;
  const { user } = req;

  let query = { hr: user._id };

  if (employeeId) {
    query.employee = employeeId;
  }

  if (month) {
    query.month = parseInt(month);
  }

  if (year) {
    query.year = parseInt(year);
  }

  if (status) {
    query.status = status;
  }

  const doc =
    noPagination && noPagination == 'true'
      ? await Payroll.find(query)
          .populate({ path: 'employee', select: 'firstName lastName email employeeId' })
          .sort('-year -month')
      : await Payroll.find(query)
          .populate({ path: 'employee', select: 'firstName lastName email employeeId' })
          .sort('-year -month')
          .skip(skip)
          .limit(limit);

  const totalCount = await Payroll.countDocuments(query);

  res.status(200).json({
    status: 'success',
    totalCount,
    data: doc,
  });
});

// Get single payroll
exports.getPayroll = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  const payroll = await Payroll.findOne({ _id: id, hr: user._id }).populate({
    path: 'employee',
  });

  if (!payroll) {
    return next(new AppError('Payroll not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: payroll,
  });
});

// Update payroll
exports.updatePayroll = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  // Recalculate net salary if earnings or deductions are updated
  if (req.body.totalEarnings || req.body.totalDeductions) {
    const payroll = await Payroll.findById(id);
    const totalEarnings = req.body.totalEarnings || payroll.totalEarnings;
    const totalDeductions = req.body.totalDeductions || payroll.totalDeductions;
    req.body.netSalary = totalEarnings - totalDeductions;
  }

  const payroll = await Payroll.findOneAndUpdate(
    { _id: id, hr: user._id },
    req.body,
    {
      new: true,
      runValidators: true,
    }
  ).populate({ path: 'employee' });

  if (!payroll) {
    return next(new AppError('Payroll not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: payroll,
  });
});

// Mark payroll as paid
exports.markAsPaid = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { paymentMethod, transactionId } = req.body;
  const { user } = req;

  const payroll = await Payroll.findOneAndUpdate(
    { _id: id, hr: user._id },
    {
      status: 'Paid',
      paidDate: new Date(),
      paymentMethod: paymentMethod || 'Bank Transfer',
      transactionId: transactionId || undefined,
    },
    { new: true }
  ).populate({ path: 'employee' });

  if (!payroll) {
    return next(new AppError('Payroll not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Payroll marked as paid',
    data: payroll,
  });
});

// Delete payroll
exports.deletePayroll = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  const payroll = await Payroll.findOneAndDelete({ _id: id, hr: user._id });

  if (!payroll) {
    return next(new AppError('Payroll not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Payroll deleted successfully',
    data: payroll,
  });
});

// Get payroll statistics
exports.getPayrollStatistics = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { year } = req.query;

  let query = { hr: user._id };
  if (year) {
    query.year = parseInt(year);
  }

  const totalPayrolls = await Payroll.countDocuments(query);
  const paidPayrolls = await Payroll.countDocuments({ ...query, status: 'Paid' });
  const pendingPayrolls = await Payroll.countDocuments({ ...query, status: 'Generated' });

  const payrolls = await Payroll.find(query);
  const totalSalaryPaid = payrolls
    .filter((p) => p.status === 'Paid')
    .reduce((sum, p) => sum + p.netSalary, 0);

  res.status(200).json({
    status: 'success',
    data: {
      totalPayrolls,
      paidPayrolls,
      pendingPayrolls,
      totalSalaryPaid: Math.round(totalSalaryPaid * 100) / 100,
    },
  });
});

