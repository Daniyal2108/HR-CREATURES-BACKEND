const Questionaire = require('../models/questionaireTemplateModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Vacancy = require('../models/vacancyModel');

exports.createQuestionaire = catchAsync(async (req, res, next) => {

  const { user } = req;
  let counter = 0

  req.body.hr = user?._id;

  await req.body.questions.forEach((ele) => {
    if (!ele.options.includes(ele?.correctAnswer)) {
      counter++;
    }
  })

  if (counter > 0) return next(new AppError("Invalid option!", 400))

  const doc = await Questionaire.create(req.body);

  res.status(201).json({
    status: 'success',
    data: doc,
  });

});

exports.updateQuestionaire = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const doc = await Questionaire.findByIdAndUpdate(id, req.body, { new: true });

  if (!doc) return next(new AppError("Error While updating Questionaire"));

  res.status(200).json({
    status: 'success',
    data: doc,
  });
});

exports.getQuestionaireTemplateDetail = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const doc = await Questionaire.findById(id).populate({path:'hr'});

  if (!doc) return next(new AppError("Questionaire Template Not Found"));

  res.status(200).json({
    status: 'success',
    data: doc,
  });
});

exports.deleteQuestionaire = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const foundVacancy=await Vacancy.findOne({questionaireTemplate:id});

  if(foundVacancy){
    return next(new AppError("Cannot Delete Template as it is used in some Vacancy",400))
  }

 const deletedQuestionaire= await Questionaire.findByIdAndDelete(id);

  res.status(200).json({
    status: 'success',
    message:"Successfully Deleted",
    data:deletedQuestionaire
  });
});

exports.getMyQuestionaireTemplates = catchAsync(async (req, res, next) => {
  // for pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 15;
  const skip = (page - 1) * limit;
  const { noPagination, search } = req.query;
  const { user } = req;

  let query = {
    hr: user?._id,
    status:'Active'
  };

  if (search && search != '')
    query = {
      ...query,
      title: { $regex: search, $options: 'i' }
    };


  const doc =
    noPagination && noPagination == 'true'
      ? await Questionaire.find(query).populate({path:'hr'}).sort('title')
      : await Questionaire.find(query).populate({path:'hr'})
        .sort('title')
        .skip(skip)
        .limit(limit);

  const totalCount = await Questionaire.countDocuments({ hr: user?._id });

  res.status(200).json({
    status: 'success',
    totalCount,
    data: doc,
  });
});
