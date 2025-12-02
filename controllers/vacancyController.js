const Vacancy = require('../models/vacancyModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { deleteFile } = require('../utils/s3');
const VacancyTemplate = require('../models/vacancyTemplateModel');
const Questionaire = require('../models/questionaireTemplateModel');
const Result = require('../models/resultModel');
const moment=require('moment');
const { DataSessionInstance } = require('twilio/lib/rest/wireless/v1/sim/dataSession');

exports.getAllVacancies = catchAsync(async (req, res, next) => {
  // for pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 15;
  const skip = (page - 1) * limit;
  const { noPagination } = req.query;
  const { user } = req;

  const doc =
    noPagination && noPagination == 'true'
      ? await Vacancy.find({ hr: user?._id,status:{$in:['Active','Inactive','Expired']}}).populate({ path: 'vacancyTemplate' })
      : await Vacancy.find({ hr: user?._id,status:{$in:['Active','Inactive','Expired']}}).populate({ path: 'vacancyTemplate' })
        .sort('name')
        .skip(skip)
        .limit(limit);

  res.status(200).json({
    status: 'success',
    data: doc,
  });
});

exports.addVacancy = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { education, experience, expectedJoiningDate, age, expectedSalary, skills, vacancyTemplate, lastDateOfApply, joiningDate } = req.body;
  let obj = { hr: user?._id, vacancyTemplate, lastDateOfApply, joiningDate };
  let noOfParameters = 0;

  const foundVacancyTemplate = await VacancyTemplate.findById(vacancyTemplate);

  if (["true", true].includes(education)) {
    obj = { ...obj, education: foundVacancyTemplate?.education }
    noOfParameters += 1
  }

  if (["true", true].includes(experience)) {
    obj = { ...obj, experience: foundVacancyTemplate?.experience }
    noOfParameters += 1
  }

  if (["true", true].includes(expectedJoiningDate)) {
    obj = { ...obj, expectedJoiningDate: foundVacancyTemplate?.expectedJoiningDate }
    noOfParameters += 1
  }

  if (["true", true].includes(age)) {
    obj = { ...obj, age: foundVacancyTemplate?.age }
    noOfParameters += 1
  }

  if (["true", true].includes(expectedSalary)) {
    obj = { ...obj, expectedSalary: foundVacancyTemplate?.expectedSalary }
    noOfParameters += 1
  }

  if (["true", true].includes(skills)) {
    obj = { ...obj, skills: foundVacancyTemplate?.skills }
    noOfParameters += 1
  }

  const doc = await Vacancy.create({ ...obj, noOfParameters });

  res.status(201).json({
    status: 'success',
    data: doc,
  });
});

exports.updateVacancy = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const foundVacancy = await Vacancy.findById(id);

  if(req.body.status=="Deactivate"){
    req.body.status='Inactive'
  }

  if(req.body.status=="Activate"){
    req.body.status='Active'
  }

  if (req.body.paScore > foundVacancy?.totalVacancyPaScore) {
    return next(new AppError("SP Score Cannot be greater than total SP Score", 400))
  }

  if (req.body.qaScore > foundVacancy?.totalVacancyQaScore) {
    return next(new AppError("QA Score Cannot be greater than total QA Score", 400))
  }

  if (req.body.totalScore) {
    if (Number(req.body.totalScore) > foundVacancy?.totalVacancyScore) {
      return next(new AppError("Total Score cannot be greater than Total Score", 400))
    }
  }

  if (req.body.paScore) {
    req.body.paScoreValue = (foundVacancy?.totalVacancyPaScore / foundVacancy?.noOfParameters).toFixed(2);
  }

  if (req.body.qaScore) {
    req.body.qaScoreValue = (foundVacancy?.totalVacancyQaScore / foundVacancy?.noOfQuestions).toFixed(2);
  }

  if (req.body.questionaireTemplate) {
    const questionaireData = await Questionaire.findById(req.body.questionaireTemplate)
    req.body.noOfQuestions = questionaireData?.questions.length;
    // req.body.noOfQuestions==(foundVacancy?.totalVacancyQaScore/req.body.qaScore).toFixed(2);
  }

  const vacancy = await Vacancy.findByIdAndUpdate(id, req.body, {
    new: true,
  }).populate([{ path: 'vacancyTemplate' }, { path: 'questionaireTemplate' }]);

  res.status(200).json({
    status: 'success',
    data: vacancy,
  });
});

exports.getVacancyData = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const vacancy = await Vacancy.findById(id).populate([{ path: 'vacancyTemplate', populate: { path: 'department' } }, { path: 'questionaireTemplate' },{ path: 'selected' },{ path: 'rejected' }]);

  res.status(200).json({
    status: 'success',
    data: vacancy,
  });
});

exports.deleteVacancy = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const deletedVacancy=await Vacancy.findByIdAndDelete(id);

  if(!deletedVacancy)return next(new AppError("Vacancy Not Found",400))

  res.status(200).json({
    status: 'success',
    data:deletedVacancy
  });
});

exports.getAllVacanciesForHr = catchAsync(async (req, res, next) => {
  // for pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 15;
  const skip = (page - 1) * limit;
  const { noPagination } = req.query;

  const doc =
    noPagination && noPagination == 'true'
      ? await Vacancy.find().sort('name')
      : await Vacancy.find()
        .sort('name')
        .skip(skip)
        .limit(limit);

  const totalCount = await Vacancy.countDocuments();

  res.status(200).json({
    status: 'success',
    totalCount,
    data: doc,
  });
});

exports.statistics = catchAsync(async (req, res, next) => {

  const { user } = req;
  const {days}=req.query;
  let splitDays,daysNumber,daysString,date;

  if(days){
  splitDays=days.split(" ");
  daysNumber=splitDays[0];
  daysString=splitDays[1];
  date=moment().subtract(daysNumber,daysString)
  }

  const vacancyData = await Vacancy.find({ hr: user?._id,...days && {createdAt:{$gte:date}},status:'Active'});

  let candidatesApplied = 0;
  let shortlistedCandidates = 0;
  let vacancyIds=[];

  await vacancyData.map((data) => {
    candidatesApplied += Number(data?.selected.length) + Number(data?.rejected.length);
    shortlistedCandidates += Number(data?.selected.length);
    vacancyIds.push(data?._id);
  });


  const results = await Result.find({vacancy:{$in:vacancyIds}});

  let initialValue = 0;

  const totalScoreOfUsers = results.reduce(
    (accumulator, currentValue) => accumulator + currentValue?.totalScore,
    initialValue
  );

  const averageScore = (totalScoreOfUsers / results.length).toFixed(1);

  res.status(200).json({
    status: 'success',
    data: {
      vacanciesPosted: vacancyData.length,
      candidatesApplied,
      shortlistedCandidates,
      averageScore
    },
  });
});
