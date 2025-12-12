const Employee = require('../models/employeeModel');
const Result = require('../models/resultModel');
const Vacancy = require('../models/vacancyModel');
const User = require('../models/userModel');
const Company = require('../models/companyModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { deleteFile } = require('../utils/s3');

// Convert selected candidate to employee
exports.convertToEmployee = catchAsync(async (req, res, next) => {
  const { resultId, joiningDate, designation, salary } = req.body;
  const { user } = req;

  if (!resultId) {
    return next(new AppError('Result ID is required', 400));
  }

  // Get result details
  const result = await Result.findById(resultId).populate({
    path: 'vacancy',
    populate: { path: 'vacancyTemplate', populate: { path: 'department' } },
  });

  if (!result) {
    return next(new AppError('Result not found', 404));
  }

  if (result.status !== 'selected') {
    return next(new AppError('Only selected candidates can be converted to employees', 400));
  }

  // Check if employee already exists
  const existingEmployee = await Employee.findOne({ result: resultId });
  if (existingEmployee) {
    return next(new AppError('Employee already exists for this candidate', 400));
  }

  // Get company from HR user
  const hrUser = await User.findById(user._id).populate('company');
  let companyId = hrUser?.company?._id || hrUser?.company;
  
  // If company not found in user, try to get from vacancy
  if (!companyId && result?.vacancy?.vacancyTemplate?.department) {
    const Department = require('../models/departmentModel');
    const department = await Department.findById(result.vacancy.vacancyTemplate.department).populate('user');
    if (department?.user?.company) {
      const deptUser = await User.findById(department.user._id || department.user).populate('company');
      companyId = deptUser?.company?._id || deptUser?.company;
    }
  }

  if (!companyId) {
    return next(new AppError('Company not found. Please ensure your account is associated with a company.', 400));
  }

  // Create employee from result data
  // Split fullName into firstName and lastName
  const fullNameParts = result.fullName?.trim().split(' ') || [];
  const firstName = fullNameParts[0] || 'N/A';
  const lastName = fullNameParts.slice(1).join(' ') || fullNameParts[0] || 'N/A';

  const employeeData = {
    hr: user._id,
    company: companyId,
    department: result?.vacancy?.vacancyTemplate?.department?._id,
    vacancy: result.vacancy?._id,
    result: resultId,
    firstName: firstName,
    lastName: lastName,
    email: result.email,
    phone: result.phone,
    age: result.age,
    education: result.education,
    additionalEducation: result.additionalEducation,
    experience: result.experience,
    skills: result.skills || [],
    uploadCv: result.uploadCv,
    paScore: result.paScore,
    qaScore: result.qaScore,
    totalScore: result.totalScore,
    dynamicInputs: result.dynamicInputs,
    joiningDate: joiningDate || result.expectedJoiningDate || new Date(),
    designation: designation || result?.vacancy?.vacancyTemplate?.jobTitle,
    jobTitle: result?.vacancy?.vacancyTemplate?.jobTitle,
    salary: salary || result.expectedSalary,
    employmentStatus: 'Active',
    employmentType: 'Full-Time',
  };

  const employee = await Employee.create(employeeData);

  // Optionally create user account for employee
  // This can be done later or via separate endpoint

  res.status(201).json({
    status: 'success',
    data: employee,
  });
});

// Get all employees
exports.getAllEmployees = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 15;
  const skip = (page - 1) * limit;
  const { noPagination, search, status, department } = req.query;
  const { user } = req;

  let query = { hr: user._id };

  if (status) {
    query.employmentStatus = status;
  }

  if (department) {
    query.department = department;
  }

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
    ];
  }

  const doc =
    noPagination && noPagination == 'true'
      ? await Employee.find(query)
          .populate([
            { path: 'company' },
            { path: 'department' },
            { path: 'vacancy', populate: { path: 'vacancyTemplate', populate: { path: 'department' } } },
          ])
          .sort('-createdAt')
          .lean()
      : await Employee.find(query)
          .populate([
            { path: 'company' },
            { path: 'department' },
            { path: 'vacancy', populate: { path: 'vacancyTemplate', populate: { path: 'department' } } },
          ])
          .sort('-createdAt')
          .skip(skip)
          .limit(limit)
          .lean();

  // Map department name
  const mappedDoc = doc.map((emp) => ({
    ...emp,
    department: emp.department?.name || emp.vacancy?.vacancyTemplate?.department?.name || emp.department || 'N/A',
  }));

  const totalCount = await Employee.countDocuments(query);

  res.status(200).json({
    status: 'success',
    totalCount,
    data: mappedDoc,
  });
});

// Get single employee
exports.getEmployee = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  const employee = await Employee.findOne({ _id: id, hr: user._id }).populate([
    { path: 'company' },
    { path: 'department' },
    { path: 'vacancy', populate: { path: 'vacancyTemplate' } },
    { path: 'result' },
    { path: 'userAccount' },
  ]);

  if (!employee) {
    return next(new AppError('Employee not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: employee,
  });
});

// Update employee
exports.updateEmployee = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  const employee = await Employee.findOneAndUpdate(
    { _id: id, hr: user._id },
    req.body,
    {
      new: true,
      runValidators: true,
    }
  ).populate([
    { path: 'company' },
    { path: 'department' },
    { path: 'vacancy' },
  ]);

  if (!employee) {
    return next(new AppError('Employee not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: employee,
  });
});

// Delete employee (soft delete - change status to terminated)
exports.deleteEmployee = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  const employee = await Employee.findOneAndUpdate(
    { _id: id, hr: user._id },
    {
      employmentStatus: 'Terminated',
      terminationDate: new Date(),
    },
    { new: true }
  );

  if (!employee) {
    return next(new AppError('Employee not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Employee terminated successfully',
    data: employee,
  });
});

// Get employee statistics
exports.getEmployeeStatistics = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { days } = req.query;
  let date;

  if (days) {
    const splitDays = days.split(' ');
    const daysNumber = splitDays[0];
    const daysString = splitDays[1];
    const moment = require('moment');
    date = moment().subtract(daysNumber, daysString);
  }

  const query = {
    hr: user._id,
    ...(days && { createdAt: { $gte: date } }),
  };

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

  // Department wise distribution
  const departmentStats = await Employee.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$department',
        count: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      totalEmployees,
      activeEmployees,
      onLeaveEmployees,
      terminatedEmployees,
      departmentStats,
    },
  });
});

// Bulk convert selected candidates to employees
exports.bulkConvertToEmployee = catchAsync(async (req, res, next) => {
  const { resultIds, joiningDate } = req.body;
  const { user } = req;

  if (!resultIds || !Array.isArray(resultIds) || resultIds.length === 0) {
    return next(new AppError('Result IDs array is required', 400));
  }

  const results = await Result.find({
    _id: { $in: resultIds },
    status: 'selected',
  }).populate({
    path: 'vacancy',
    populate: { path: 'vacancyTemplate', populate: { path: 'department' } },
  });

  if (results.length === 0) {
    return next(new AppError('No selected candidates found', 404));
  }

  // Get company from HR user
  const hrUser = await User.findById(user._id).populate('company');
  const companyId = hrUser?.company;

  if (!companyId) {
    return next(new AppError('Company not found', 400));
  }

  const employees = [];

  for (const result of results) {
    // Check if employee already exists
    const existingEmployee = await Employee.findOne({ result: result._id });
    if (existingEmployee) {
      continue; // Skip if already exists
    }

    // Split fullName into firstName and lastName
    const fullNameParts = result.fullName?.trim().split(' ') || [];
    const firstName = fullNameParts[0] || 'N/A';
    const lastName = fullNameParts.slice(1).join(' ') || fullNameParts[0] || 'N/A';

    const employeeData = {
      hr: user._id,
      company: companyId,
      department: result?.vacancy?.vacancyTemplate?.department?._id,
      vacancy: result.vacancy?._id,
      result: result._id,
      firstName: firstName,
      lastName: lastName,
      email: result.email,
      phone: result.phone,
      age: result.age,
      education: result.education,
      additionalEducation: result.additionalEducation,
      experience: result.experience,
      skills: result.skills || [],
      uploadCv: result.uploadCv,
      paScore: result.paScore,
      qaScore: result.qaScore,
      totalScore: result.totalScore,
      dynamicInputs: result.dynamicInputs,
      joiningDate: joiningDate || result.expectedJoiningDate || new Date(),
      designation: result?.vacancy?.vacancyTemplate?.jobTitle,
      jobTitle: result?.vacancy?.vacancyTemplate?.jobTitle,
      salary: result.expectedSalary,
      employmentStatus: 'Active',
      employmentType: 'Full-Time',
    };

    const employee = await Employee.create(employeeData);
    employees.push(employee);
  }

  res.status(201).json({
    status: 'success',
    message: `${employees.length} employees created successfully`,
    data: employees,
  });
});

