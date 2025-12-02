const mongoose = require("mongoose");
const { DataSessionList } = require("twilio/lib/rest/wireless/v1/sim/dataSession");

const ResultSchema = new mongoose.Schema(
    {
        vacancy:{
            type:mongoose.Schema.Types.ObjectId,ref:"Vacancy"
        },
        status:{
            type:String,
            enum:['selected','rejected']
        },
        fullName:{
            type:String,
        },
        email:{
            type:String,
        },
        phone:{
            type:String
        },
        additionalEducation:{
            type:String
        },
        age:{
            type:Number
        },
        expectedJoiningDate:{
            type:Date
        },
        experience:{
            type:String
        },
        education:{
            type:String
        },
        expectedSalary:{
            type:Number
        },
        paScore:{
            type:Number,
        },
        qaScore:{
            type:Number,
        },
        totalScore:{
            type:Number,
        },
        uploadCv:{
            type:String,
        },
        dynamicInputs:{
            type:Object,
        },
    },
    { timestamps: true }
);

const Result = mongoose.model("Result", ResultSchema);
module.exports = Result;
