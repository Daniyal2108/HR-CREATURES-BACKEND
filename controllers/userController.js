const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const { createNotification } = require('../controllers/notificationController');
const { deleteFile } = require('../utils/s3');
const crypto = require('crypto');

const notificationHandler = async (
  sender,
  receiver,
  message,
  forr,
  notfTitle,
  fcmToken
) => {
  await createNotification(
    { title: notfTitle, fcmToken },
    {
      sender,
      receiver,
      message,
      for: forr,
      title: notfTitle,
    }
  );
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  const files = req.files;
  const { _id } = req.user;
  let updatedUser;

  if (files?.photo) {
    // if (req.user.photo != 'default.png') await deleteFile(req.user?.photo);
    req.body.photo = files?.photo[0].key;
  }

  // 3) Update user document
  updatedUser = await User.findByIdAndUpdate(_id, req.body, {
    new: true,
    runValidators: true,
  })

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined! Please use /signup instead',
  });
};

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ _id: req.user._id }).lean();

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

exports.getSpecificUserDetails= catchAsync(async (req, res, next) => {
  const { id } = req.params;

  let user = await User.findById(id)

  if(!user)return next(new AppError("User Not Found",400));

  res.status(200).json({
    status: 'success',
    data: user,
  });
});