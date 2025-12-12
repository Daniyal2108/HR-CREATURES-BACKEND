const Attendance = require('../models/attendanceModel');
const Employee = require('../models/employeeModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const moment = require('moment');

// Mark attendance (Check-in)
exports.checkIn = catchAsync(async (req, res, next) => {
  const { employeeId, location } = req.body;
  const { user } = req;

  if (!employeeId) {
    return next(new AppError('Employee ID is required', 400));
  }

  const employee = await Employee.findOne({ _id: employeeId, hr: user._id });
  if (!employee) {
    return next(new AppError('Employee not found', 404));
  }

  const today = moment().startOf('day').toDate();
  const now = new Date();

  // Check if attendance already exists for today
  let attendance = await Attendance.findOne({
    employee: employeeId,
    date: today,
  });

  if (attendance && attendance.checkIn) {
    return next(new AppError('Already checked in for today', 400));
  }

  if (attendance) {
    // Update existing attendance
    attendance.checkIn = now;
    attendance.status = 'Present';
    if (location) {
      attendance.location = location;
    }
    await attendance.save();
  } else {
    // Create new attendance
    attendance = await Attendance.create({
      employee: employeeId,
      hr: user._id,
      date: today,
      checkIn: now,
      status: 'Present',
      location: location || undefined,
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Checked in successfully',
    data: attendance,
  });
});

// Mark attendance (Check-out)
exports.checkOut = catchAsync(async (req, res, next) => {
  const { employeeId } = req.body;
  const { user } = req;

  if (!employeeId) {
    return next(new AppError('Employee ID is required', 400));
  }

  const today = moment().startOf('day').toDate();
  const now = new Date();

  const attendance = await Attendance.findOne({
    employee: employeeId,
    date: today,
    hr: user._id,
  });

  if (!attendance) {
    return next(new AppError('No check-in found for today', 404));
  }

  if (attendance.checkOut) {
    return next(new AppError('Already checked out for today', 400));
  }

  // Check minimum time requirement (30 minutes) before allowing checkout
  if (attendance.checkIn) {
    const checkInTime = moment(attendance.checkIn);
    const checkOutTime = moment(now);
    const minutesDiff = checkOutTime.diff(checkInTime, 'minutes');
    
    // Minimum 30 minutes required between check-in and check-out
    const MINIMUM_MINUTES = 30;
    
    if (minutesDiff < MINIMUM_MINUTES) {
      const remainingMinutes = MINIMUM_MINUTES - minutesDiff;
      return next(
        new AppError(
          `You must work for at least ${MINIMUM_MINUTES} minutes before checking out. Please wait ${remainingMinutes} more minute(s).`,
          400
        )
      );
    }
  }

  attendance.checkOut = now;

  // Calculate working hours
  if (attendance.checkIn) {
    const checkInTime = moment(attendance.checkIn);
    const checkOutTime = moment(now);
    const hours = checkOutTime.diff(checkInTime, 'hours', true);
    attendance.workingHours = Math.round(hours * 100) / 100;

    // Calculate overtime (assuming 8 hours is standard)
    if (attendance.workingHours > 8) {
      attendance.overtimeHours = Math.round((attendance.workingHours - 8) * 100) / 100;
    }
  }

  await attendance.save();

  res.status(200).json({
    status: 'success',
    message: 'Checked out successfully',
    data: attendance,
  });
});

// Get all attendance records
exports.getAllAttendance = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 15;
  const skip = (page - 1) * limit;
  const { noPagination, employeeId, startDate, endDate, status } = req.query;
  const { user } = req;

  let query = { hr: user._id };

  if (employeeId) {
    query.employee = employeeId;
  }

  if (status) {
    query.status = status;
  }

  if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  } else if (startDate) {
    query.date = { $gte: new Date(startDate) };
  } else if (endDate) {
    query.date = { $lte: new Date(endDate) };
  }

  const doc =
    noPagination && noPagination == 'true'
      ? await Attendance.find(query)
          .populate({ path: 'employee', select: 'firstName lastName email employeeId' })
          .sort('-date')
      : await Attendance.find(query)
          .populate({ path: 'employee', select: 'firstName lastName email employeeId' })
          .sort('-date')
          .skip(skip)
          .limit(limit);

  const totalCount = await Attendance.countDocuments(query);

  res.status(200).json({
    status: 'success',
    totalCount,
    data: doc,
  });
});

// Get single attendance record
exports.getAttendance = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  const attendance = await Attendance.findOne({ _id: id, hr: user._id }).populate({
    path: 'employee',
  });

  if (!attendance) {
    return next(new AppError('Attendance record not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: attendance,
  });
});

// Update attendance manually (HR can update)
exports.updateAttendance = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  // Recalculate working hours if check-in/check-out is updated
  if (req.body.checkIn || req.body.checkOut) {
    const attendance = await Attendance.findById(id);
    const checkIn = req.body.checkIn || attendance.checkIn;
    const checkOut = req.body.checkOut || attendance.checkOut;

    if (checkIn && checkOut) {
      const checkInTime = moment(checkIn);
      const checkOutTime = moment(checkOut);
      const hours = checkOutTime.diff(checkInTime, 'hours', true);
      req.body.workingHours = Math.round(hours * 100) / 100;

      if (req.body.workingHours > 8) {
        req.body.overtimeHours = Math.round((req.body.workingHours - 8) * 100) / 100;
      }
    }
  }

  const attendance = await Attendance.findOneAndUpdate(
    { _id: id, hr: user._id },
    req.body,
    {
      new: true,
      runValidators: true,
    }
  ).populate({ path: 'employee' });

  if (!attendance) {
    return next(new AppError('Attendance record not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: attendance,
  });
});

// Delete attendance
exports.deleteAttendance = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  const attendance = await Attendance.findOneAndDelete({ _id: id, hr: user._id });

  if (!attendance) {
    return next(new AppError('Attendance record not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Attendance record deleted successfully',
    data: attendance,
  });
});

// Get attendance statistics
exports.getAttendanceStatistics = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { employeeId, month, year } = req.query;

  let query = { hr: user._id };
  if (employeeId) {
    query.employee = employeeId;
  }

  if (month && year) {
    const startDate = moment(`${year}-${month}-01`).startOf('month').toDate();
    const endDate = moment(`${year}-${month}-01`).endOf('month').toDate();
    query.date = { $gte: startDate, $lte: endDate };
  }

  const totalRecords = await Attendance.countDocuments(query);
  const presentCount = await Attendance.countDocuments({ ...query, status: 'Present' });
  const absentCount = await Attendance.countDocuments({ ...query, status: 'Absent' });
  const lateCount = await Attendance.countDocuments({ ...query, status: 'Late' });
  const leaveCount = await Attendance.countDocuments({ ...query, status: 'Leave' });

  // Calculate total working hours
  const attendances = await Attendance.find({ ...query, status: 'Present' });
  const totalWorkingHours = attendances.reduce(
    (sum, att) => sum + (att.workingHours || 0),
    0
  );
  const totalOvertimeHours = attendances.reduce(
    (sum, att) => sum + (att.overtimeHours || 0),
    0
  );

  res.status(200).json({
    status: 'success',
    data: {
      totalRecords,
      presentCount,
      absentCount,
      lateCount,
      leaveCount,
      totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
      totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
    },
  });
});

