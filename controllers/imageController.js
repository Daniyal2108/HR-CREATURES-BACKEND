const catchAsync = require('../utils/catchAsync');
exports.getImageKeys = catchAsync(async (req, res, next) => {
    const data={
        image:"https://hr-management-development.s3.eu-west-2.amazonaws.com/backgroundImg.png",
        video:"https://hr-management-development.s3.eu-west-2.amazonaws.com/desktop.mp4",
      }
  
      res.status(200).json({
        status: 'success',
        data,
      });
});