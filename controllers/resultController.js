const Questionaire = require('../models/questionaireTemplateModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Vacancy = require('../models/vacancyModel');
const Result = require('../models/resultModel');

exports.generateResult = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const files = req.files;
    console.log("req.body",req.body)
    console.log(typeof req.body.skills)

    const skillss=JSON.parse(req.body.skills)

    let dynamicInputs = {};
    for (let x in req.body) {

        if (x.startsWith("input")) {
            dynamicInputs = {
                ...dynamicInputs,
                [x]: req.body[x]
            }
        }
    }
    req.body.vacancy = id;
    req.body.dynamicInputs = dynamicInputs;

    const vacancyDetails = await Vacancy.findById(id).populate('questionaireTemplate');

    let userPaScoreCounter = 0;

    if (!vacancyDetails) return next(new AppError("Vacancy Not Found", 404));

    if (req.body.education == vacancyDetails?.education) {
        console.log("a")
        userPaScoreCounter++;
    }
    if (req.body.experience >= vacancyDetails?.experience) {
        console.log("b")
        userPaScoreCounter++;
    }
    if (req.body.expectedJoiningDate <= vacancyDetails?.expectedJoiningDate) {
        console.log("hello")
        var vacancyExpectedJoiningDate = moment(vacancyDetails?.expectedJoiningDate);

        var VacancyJoiningMonth = vacancyExpectedJoiningDate.format('M');
        var VacancyJoiningDay = vacancyExpectedJoiningDate.format('D');
        var VacancyJoiningYear = vacancyExpectedJoiningDate.format('YYYY');

        console.log(VacancyJoiningMonth)
        console.log(VacancyJoiningDay)
        console.log(VacancyJoiningYear)

        var UserExpectedJoiningDate = moment(req.body.expectedJoiningDate);

        var UserJoiningMonth = UserExpectedJoiningDate.format('M');
        var UserJoiningDay = UserExpectedJoiningDate.format('D');
        var UserJoiningYear = UserExpectedJoiningDate.format('YYYY');

        console.log(UserJoiningMonth)
        console.log(UserJoiningDay)
        console.log(UserJoiningYear)

        if(UserJoiningDay<=VacancyJoiningDay && UserJoiningMonth == VacancyJoiningMonth && UserJoiningYear == VacancyJoiningYear){
            console.log("c")
            userPaScoreCounter++
        }

    }

    if (req.body.age <= vacancyDetails?.age) {
        console.log("d")
        userPaScoreCounter++
    }
    if (req.body.expectedSalary <= vacancyDetails?.expectedSalary) {
        console.log("e")
        userPaScoreCounter++
    }
    if (skillss.length >= (vacancyDetails?.skills?.length - 2) && vacancyDetails?.skills?.length > 0) {
        let matchedSkills = [];
        vacancyDetails?.skills.forEach((ele) => {
            skillss.forEach((el) => {
                if (el == ele) {
                    matchedSkills.push(el)
                }
            })
        })

        const percentage=(100/vacancyDetails?.skills.length)*matchedSkills.length;//33*matchedSkills.length

        if (percentage >=50) {
            console.log("f")
            userPaScoreCounter++
        }
    }

    console.log("counter", userPaScoreCounter)
    const userCalculatedPaScore = userPaScoreCounter * vacancyDetails?.paScoreValue;

    console.log("🚀 ~ file: resultController.js:62 ~ exports.generateResult=catchAsync ~ userCalculatedPaScore:", userCalculatedPaScore)

    req.body.paScore = userCalculatedPaScore;
    console.log("🚀 ~ file: resultController.js:65 ~ exports.generateResult=catchAsync ~  req.body.paScore :", req.body)

    if (files?.uploadCv) {
        req.body.uploadCv = files?.uploadCv[0].key;
    }

    const doc = await Result.create(req.body);

    res.status(201).json({
        status: 'success',
        data: doc,
    });
});

exports.submit = catchAsync(async (req, res, next) => {
    const { id } = req.params;//result id
    const { questionAnswers } = req.body;
    let userQaScoreCounter = 0;

    const resultDetails = await Result.findById(id).populate({ path: 'vacancy', populate: { path: 'questionaireTemplate' } });

    if (!resultDetails) return next(new AppError("Result Not Found", 404));

    resultDetails?.vacancy?.questionaireTemplate?.questions.forEach((ele) => {
        questionAnswers.forEach((el) => {
            if (ele?.question == el?.question && ele?.correctAnswer == el?.answer) {
                // qaScore += vacancyDetails?.qaScoreValue;
                userQaScoreCounter++;
            }
        })
    })
    
    console.log("🚀 ~ file: resultController.js:131 ~ questionAnswers.forEach ~ userQaScoreCounter:", userQaScoreCounter)
    const userCalculatedQaScore = userQaScoreCounter * resultDetails?.vacancy?.qaScoreValue;
    console.log("🚀 ~ file: resultController.js:136 ~ exports.submit=catchAsync ~ userCalculatedQaScore:", userCalculatedQaScore)

    const totalScore = resultDetails?.paScore + userCalculatedQaScore;

    // req.body.paScore = userCalculatedPaScore;
    req.body.qaScore = userCalculatedQaScore;
    req.body.totalScore = totalScore;

    totalScore >= resultDetails?.vacancy?.totalScore ? req.body.status = 'selected' : req.body.status = 'rejected';

    const doc = await Result.findByIdAndUpdate(id, req.body, { new: true });

    if (doc?.status == 'selected') {
        await Vacancy.findByIdAndUpdate(resultDetails?.vacancy?._id, { $push: { selected: doc?._id } }, { new: true })
    } else {
        await Vacancy.findByIdAndUpdate(resultDetails?.vacancy?._id, { $push: { rejected: doc?._id } }, { new: true })
    }

    res.status(201).json({
        status: 'success',
        data: doc,
    });
});

exports.getVacancyResults = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const doc = await Result.find({ vacancy: id });

    if (!doc) return next(new AppError("No Results Found", 400));

    res.status(200).json({
        status: 'success',
        data: doc,
    });
});
