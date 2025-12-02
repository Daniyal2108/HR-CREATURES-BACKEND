const VacancyTemplate = require('../models/vacancyTemplateModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Vacancy = require('../models/vacancyModel');

exports.createVacancyTemplate = catchAsync(async (req, res, next) => {

  const {user}=req;

  req.body.hr=user?._id;

  console.log("req.body",req.body)
  console.log(typeof req.body)

  const doc = await VacancyTemplate.create(req.body);

  res.status(201).json({
    status: 'success',
    data:doc,
  });
});

exports.updateVacancyTemplate = catchAsync(async (req, res, next) => {
  const {id}=req.params;

  const doc = await VacancyTemplate.findByIdAndUpdate(id,req.body,{new:true});

  if(!doc) return next(new AppError("Error While updating Vacancy Template"));

  res.status(200).json({
    status: 'success',
    data:doc,
  });
});

exports.getVacancyTemplateDetail = catchAsync(async (req, res, next) => {
  const {id}=req.params;

  const doc = await VacancyTemplate.findByIdAndUpdate(id,req.body,{new:true}).populate([{path:'hr'},{path:'department'}]);

  if(!doc) return next(new AppError("Vacanacy Template Not Found"));

  res.status(200).json({
    status: 'success',
    data:doc,
  });
});

exports.deleteVacancyTemplate = catchAsync(async (req, res, next) => {
  const {id}=req.params;

  const foundVacancy=await Vacancy.findOne({vacancyTemplate:id,status:{$in:['Active','Inactive','Expired']}});

  if(foundVacancy){
    return next(new AppError("Cannot Delete Template as it is used in some Vacancy",400))
  }

  const deletedVacancyTemplate=await VacancyTemplate.findByIdAndDelete(id);

  res.status(200).json({
    status: 'success',
    message:"Successfully Deleted",
    data:deletedVacancyTemplate
  });
});

exports. getMyVacancyTemplates = catchAsync(async (req, res, next) => {
  // for pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 15;
  const skip = (page - 1) * limit;
  const { noPagination,search} = req.query;
  const {user}=req;

  let query = { 
    hr:user?._id,
    status:'Active'
  };

  if (search && search != '')
    query = {
      ...query,
      title: { $regex: search, $options: 'i' }
    };


  const doc =
    noPagination && noPagination == 'true'
      ? await VacancyTemplate.find(query).populate([{path:'department'},{path:'hr'}]).sort('title')
      : await VacancyTemplate.find(query).populate([{path:'department'},{path:'hr'}])
          .sort('title')
          .skip(skip)
          .limit(limit);

  const totalCount = await VacancyTemplate.countDocuments({hr:user?._id});

  res.status(200).json({
    status: 'success',
    totalCount,
    data: doc,
  });
});
