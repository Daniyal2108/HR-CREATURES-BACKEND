const Employee = require('../models/employeeModel');
const Attendance = require('../models/attendanceModel');
const Leave = require('../models/leaveModel');
const Payroll = require('../models/payrollModel');
const PerformanceReview = require('../models/performanceReviewModel');
const Vacancy = require('../models/vacancyModel');
const Result = require('../models/resultModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const moment = require('moment');

// Get comprehensive HR dashboard reports
exports.getHRDashboard = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { days } = req.query;
  let date;

  if (days) {
    const splitDays = days.split(' ');
    const daysNumber = splitDays[0];
    const daysString = splitDays[1];
    date = moment().subtract(daysNumber, daysString);
  }

  const query = { hr: user._id, ...(days && { createdAt: { $gte: date } }) };

  // Employee Statistics
  const totalEmployees = await Employee.countDocuments(query);
  const activeEmployees = await Employee.countDocuments({
    ...query,
    employmentStatus: 'Active',
  });
  const onLeaveEmployees = await Employee.countDocuments({
    ...query,
    employmentStatus: 'On Leave',
  });
  const terminatedEmployees = await Employee.countDocuments({
    ...query,
    employmentStatus: 'Terminated',
  });

  // Vacancy Statistics
  const activeVacancies = await Vacancy.countDocuments({
    ...query,
    status: 'Active',
  });
  const totalCandidates = await Result.countDocuments({
    vacancy: { $in: await Vacancy.find(query).distinct('_id') },
  });

  // Attendance Statistics (current month)
  const currentMonthStart = moment().startOf('month').toDate();
  const currentMonthEnd = moment().endOf('month').toDate();
  const attendanceQuery = {
    hr: user._id,
    date: { $gte: currentMonthStart, $lte: currentMonthEnd },
  };
  const presentCount = await Attendance.countDocuments({
    ...attendanceQuery,
    status: 'Present',
  });
  const absentCount = await Attendance.countDocuments({
    ...attendanceQuery,
    status: 'Absent',
  });

  // Leave Statistics (current month)
  const pendingLeaves = await Leave.countDocuments({
    ...query,
    status: 'Pending',
  });
  const approvedLeaves = await Leave.countDocuments({
    ...query,
    status: 'Approved',
  });

  // Payroll Statistics (current month)
  const currentMonth = moment().month() + 1;
  const currentYear = moment().year();
  const payrollQuery = {
    hr: user._id,
    month: currentMonth,
    year: currentYear,
  };
  const totalPayrolls = await Payroll.countDocuments(payrollQuery);
  const paidPayrolls = await Payroll.countDocuments({
    ...payrollQuery,
    status: 'Paid',
  });
  const payrolls = await Payroll.find({ ...payrollQuery, status: 'Paid' });
  const totalSalaryPaid = payrolls.reduce((sum, p) => sum + p.netSalary, 0);

  // Performance Reviews
  const totalReviews = await PerformanceReview.countDocuments(query);
  const completedReviews = await PerformanceReview.countDocuments({
    ...query,
    status: 'Completed',
  });

  res.status(200).json({
    status: 'success',
    data: {
      employees: {
        total: totalEmployees,
        active: activeEmployees,
        onLeave: onLeaveEmployees,
        terminated: terminatedEmployees,
      },
      vacancies: {
        active: activeVacancies,
        totalCandidates: totalCandidates,
      },
      attendance: {
        present: presentCount,
        absent: absentCount,
      },
      leaves: {
        pending: pendingLeaves,
        approved: approvedLeaves,
      },
      payroll: {
        total: totalPayrolls,
        paid: paidPayrolls,
        totalSalaryPaid: Math.round(totalSalaryPaid * 100) / 100,
      },
      performance: {
        total: totalReviews,
        completed: completedReviews,
      },
    },
  });
});

// Get employee summary report
exports.getEmployeeSummary = catchAsync(async (req, res, next) => {
  const { employeeId } = req.params;
  const { user } = req;

  const employee = await Employee.findOne({ _id: employeeId, hr: user._id });
  if (!employee) {
    return next(new AppError('Employee not found', 404));
  }

  // Get attendance summary (last 30 days)
  const thirtyDaysAgo = moment().subtract(30, 'days').startOf('day').toDate();
  const attendanceRecords = await Attendance.find({
    employee: employeeId,
    date: { $gte: thirtyDaysAgo },
  });
  const presentDays = attendanceRecords.filter((a) => a.status === 'Present').length;
  const totalWorkingHours = attendanceRecords.reduce(
    (sum, a) => sum + (a.workingHours || 0),
    0
  );

  // Get leave summary (current year)
  const currentYear = moment().year();
  const leaves = await Leave.find({
    employee: employeeId,
    startDate: {
      $gte: new Date(`${currentYear}-01-01`),
      $lte: new Date(`${currentYear}-12-31`),
    },
  });
  const totalLeaveDays = leaves
    .filter((l) => l.status === 'Approved')
    .reduce((sum, l) => sum + l.totalDays, 0);

  // Get payroll summary (last 6 months)
  const sixMonthsAgo = moment().subtract(6, 'months');
  const payrolls = await Payroll.find({
    employee: employeeId,
    createdAt: { $gte: sixMonthsAgo.toDate() },
  }).sort('-year -month');

  // Get performance reviews
  const reviews = await PerformanceReview.find({ employee: employeeId })
    .sort('-reviewDate')
    .limit(5);

  res.status(200).json({
    status: 'success',
    data: {
      employee,
      attendance: {
        presentDays,
        totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
        records: attendanceRecords.length,
      },
      leaves: {
        totalDays: totalLeaveDays,
        totalLeaves: leaves.length,
        approved: leaves.filter((l) => l.status === 'Approved').length,
      },
      payroll: {
        recent: payrolls.slice(0, 6),
        total: payrolls.length,
      },
      performance: {
        reviews: reviews,
        latestReview: reviews[0] || null,
      },
    },
  });
});

// Get department-wise reports
exports.getDepartmentReports = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { departmentId } = req.query;

  let query = { hr: user._id };
  if (departmentId) {
    query.department = departmentId;
  }

  const employees = await Employee.find(query).populate('department');

  // Group by department
  const departmentStats = {};
  employees.forEach((emp) => {
    const deptName = emp.department?.name || 'No Department';
    if (!departmentStats[deptName]) {
      departmentStats[deptName] = {
        totalEmployees: 0,
        activeEmployees: 0,
        onLeave: 0,
        terminated: 0,
      };
    }
    departmentStats[deptName].totalEmployees++;
    if (emp.employmentStatus === 'Active') {
      departmentStats[deptName].activeEmployees++;
    } else if (emp.employmentStatus === 'On Leave') {
      departmentStats[deptName].onLeave++;
    } else if (emp.employmentStatus === 'Terminated') {
      departmentStats[deptName].terminated++;
    }
  });

  res.status(200).json({
    status: 'success',
    data: departmentStats,
  });
});

module.exports = exports;

