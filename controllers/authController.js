const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const moment = require('moment');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const generator = require('generate-password');

const { deleteImage } = require('../utils/s3');
const Company = require('../models/companyModel');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const addFCMToken = (token) => {
  let obj = {};

  if (!!token)
    obj = {
      $addToSet: {
        fcmToken: token,
      },
    };

  return obj;
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
  });

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};
exports.createSendToken = createSendToken;

exports.signup = catchAsync(async (req, res, next) => {
  let {
    firstName,
    lastName,
    email,
    company,
    role,
    designation,
    companyWebsite,
    contactNo,
    city,
    baseOrigin,
  } = req.body;

  let createdCompany;
  let obj = {};

  if (['admin'].includes(role))
    return next(new AppError('This is not a Admin Route', 403));

  const userExist = await User.findOne({
    email: req.body.email,
  });

  // If user exists but password is not generated, resend the email
  if (userExist) {
    if (!userExist.isPasswordGenerated) {
      // User exists but password not set, resend email
      const url = `${baseOrigin}/create-password/${userExist?._id}`;
      await new Email(userExist, url).sendWelcomeEmail();
      return res.status(200).json({
        message: 'Password Email Sent! Please check your email.',
      });
    }
    // User exists and password is already set
    return next(
      new AppError('User email already exist. Please login instead.', 400)
    );
  }

  const companyExist = await Company.findOne({ name: company });

  if (companyExist) {
    obj = {
      company: companyExist?._id,
    };
  } else {
    createdCompany = await Company.create({ name: company });
    obj = {
      company: createdCompany?._id,
    };
  }

  obj = {
    ...obj,
    firstName,
    lastName,
    role: 'hr',
    email,
    designation,
    companyWebsite,
    contactNo,
    city,
  };

  const newUser = await User.create(obj);

  newUser.password = null;

  const url = `${baseOrigin}/create-password/${newUser?._id}`;

  await new Email(newUser, url).sendWelcomeEmail();

  // createSendToken(newUser, 201, req, res);
  return res.status(200).json({
    message: 'Password Email Sent!',
  });
});

exports.verifyUserOtp = catchAsync(async (req, res, next) => {
  try {
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) return next(new AppError('Args missing.'), 400);

    const foundUser = await User.findOne({ contact: phoneNumber });
    if (!foundUser) return next(new AppError('User not found.'), 400);

    // client.verify
    //   .services(TWILIO_SERVICE_SID)
    //   .verificationChecks.create({
    //     to: `${foundUser?.countryCode}${foundUser?.contact}`,
    //     code,
    //   })
    //   .then(async (verification) => {
    //     if (verification.status == 'approved') {
    const user = await User.findOneAndUpdate(
      { contact: phoneNumber },
      { isVerified: true, isActive: true },
      { new: true, runValidators: false }
    );
    createSendToken(user, 200, req, res);
    //     } else return next(new AppError('Verification failed.'), 400);
    //   })
    //   .catch((err) => {
    //     return res.status(400).json({
    //       status: 'failed',
    //       message: err.message,
    //       isVerified: false,
    //     });
    //   });
  } catch (err) {
    return next(new AppError('Error..! Try again later!'), 500);
  }
});

exports.resendOtp = catchAsync(async (req, res, next) => {
  const { phoneNumber } = req.body;

  const foundUser = await User.findOne({ contact: phoneNumber });
  if (!foundUser) return next(new AppError('User not found.'), 400);

  const { countryCode } = foundUser;

  client.verify
    .services(TWILIO_SERVICE_SID)
    .verifications.create({
      to: `${countryCode}${phoneNumber}`,
      channel: 'sms',
    })
    .then(async (verification) => {
      const verificationId = verification?.sid;
      return res.status(200).json({
        status: 'success',
        data: {
          requestId: verificationId,
        },
      });
    })
    .catch((err) => {
      return res.status(400).json({
        status: 'fail',
        message: err.message,
      });
    });
});

exports.getOthersByServiceType = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 400;
  const skip = (page - 1) * limit;
  const { categoryId, noPagination, location } = req.body;

  const _distance = parseInt(process.env.DEFAULT_DISTANCE) * 1;
  const radius = 'km' === 'mi' ? _distance / 3963.2 : _distance / 6378.1;

  let query = {
    'portfolio.isActive': true,
    ...(categoryId && {
      'portfolio.serviceType.serviceId': categoryId,
    }),
    ...(location &&
      location != null && {
        location: {
          $geoWithin: { $centerSphere: [location, radius] },
        },
      }),
  };

  if (categoryId == 'all') {
    query = {
      'portfolio.isActive': true,
      role: { $in: ['other'] },
      ...(location &&
        location != null && {
          location: {
            $geoWithin: { $centerSphere: [location, radius] },
          },
        }),
    };
  }

  const users =
    noPagination && noPagination == 'true'
      ? await User.find(query).populate('portfolio.serviceType.serviceId')
      : await User.find(query)
          .populate('portfolio.serviceType.serviceId')
          .sort('-updatedAt -createdAt')
          .skip(skip)
          .limit(limit);

  const usersCount = await User.countDocuments({
    'portfolio.isActive': true,
    currentRole: { $in: ['other'] },
  });

  res.status(200).json({
    status: 'success',
    results: usersCount,
    data: users,
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // 2) Check if user exists && password is correct
  let user = await User.findOne({ email }).select('+password +isVerified');

  if (!user)
    return next(new AppError('No user is specified with this email.', 401));

  if (!user?.isPasswordGenerated)
    return next(
      new AppError('Please Create Password First Then Try to Login.', 401)
    );

  // if (!user?.isActive)
  //   return next(new AppError('Your account is not verified.', 401));

  if (['admin', 'super-admin'].some((element) => user.role.includes(element)))
    return next(new AppError('Not a admin Login.', 403));

  if (!(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) If everything ok, send token to client

  user = await User.findByIdAndUpdate(
    user._id,
    {
      isOnline: true,
    },
    { new: true }
  )
    .select('+password +isVerified')
    .lean();

  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(200).json({
    status: 'success',
    token,
    data: { user },
  });
});

// Admin login
exports.adminLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // 2) Check if user exists && password is correct
  let user = await User.findOne({ email })
    .select('+password +isVerified +wallet')
    .populate('categories');

  if (!user)
    return next(new AppError('No user is specified with this email.', 401));

  if (['host', 'tourist'].some((element) => user.role.includes(element)))
    return next(new AppError('Not a User Login.', 403));

  if (user.isVerified === false)
    return next(new AppError('Please Verify your email first', 401));

  if (!(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) If everything ok, send token to client

  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(200).json({
    status: 'success',
    token,
    data: { user },
  });
});

exports.logout = catchAsync(async (req, res) => {
  const { user } = req;

  await User.findByIdAndUpdate(user?._id, {
    lastLogout: Date.now(),
    isOnline: false,
  });

  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id).select('+wallet');
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.some((element) => req.user.role.includes(element))) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

exports.excludedTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']. role='user'
    if (roles.includes(req.user.role)) {
      return next(
        new AppError('You are not allowed to perform this action.', 403)
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  try {
    // 1) Get user based on POSTed email
    let user = await User.findOne({ email: req.body.email });

    if (!user) {
      return next(new AppError('There is no user with email address.', 404));
    }

    // 3) Send it to user's email
    const url = `https://hr-creatures-mvp.vercel.app/forget-password/set-password/${user?._id}`;

    await new Email(user, url, 'support').sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Email sent!',
    });
  } catch (err) {
    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500
    );
  }
});

exports.resetPasswordDone = catchAsync(async (req, res, next) => {
  const { id, password, passwordConfirm } = req.body;

  const user = await User.findById(id);

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('User not found.', 400));
  }
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.isPasswordGenerated = true;

  await user.save();

  res.status(200).json({
    status: 'success',
    data: user,
  });
});

exports.createPasswordDone = catchAsync(async (req, res, next) => {
  const { id, password, passwordConfirm } = req.body;

  const user = await User.findById(id);

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('User not found.', 400));
  }
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.isPasswordGenerated = true;
  await user.save();
  user.password = null;

  createSendToken(user, 201, req, res);
  // return res.status(200).json({
  //   message: 'Password Created Successfully',
  //   data:user,
  // });
});
/* 
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  createSendToken(user, 200, req, res);
});
 */
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  createSendToken(user, 200, req, res);
});
