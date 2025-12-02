const admin = require('firebase-admin');
const Notification = require('../models/notificationModel');
const catchAsync = require('../utils/catchAsync');
const io = require('../utils/socket');
const factory = require('./handlerFactory');
// const serviceAccount = require('../hr-management-backend-firebase-adminsdk-sqgwb-ebb2b56756');
// const AppError = require('./../utils/appError');

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

exports.seenNotifiation = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 15;
  const skip = (page - 1) * limit;

  let notfs;
  // this will always be zero because after seen there will not any new notification left
  let newNotifications = 0;

  // seen notification
  const a = await Notification.updateMany(
    {
      seen: false,
      receiver: req.user._id,
      createdAt: { $gte: req.user.lastLogin },
    },
    { seen: true },
    { new: true }
  )
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // getting notification
  notfs = await Notification.find({
    receiver: req.user._id,
  })
    .populate('sender', 'firstName lastName companyName photo coverPhoto')
    // .populate('receiver')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    status: 'success',
    results: notfs.length,
    newNotifications,
    data: notfs,
  });
});

exports.notfsCount = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 15;
  const skip = (page - 1) * limit;

  let notfs;
  // this will always be zero because after seen there will not any new notification left
  let newNotifications = 0;

  // getting notification
  notfs = await Notification.countDocuments({
    receiver: req.user._id,
    seen: false,
  })
    .populate('sender', 'firstName lastName companyName photo coverPhoto')
    // .populate('receiver')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    status: 'success',
    results: notfs.length,
    newNotifications,
    data: notfs,
  });
});

exports.generateNotification = catchAsync(async (req, res, next) => {

  // getting notification
const createdNotification = await Notification.create(req.body)
   

  res.status(200).json({
    data: createdNotification,
  });
});

exports.getAllNotificationsForAll = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 15;
  const skip = (page - 1) * limit;

  // checking for new notifications
  const newNotifications = await Notification.countDocuments({
    receiver: req.user._id,
    seen: false,
    createdAt: { $gte: req.user.lastLogin },
  });

  // sending notification
  const notfs = await Notification.find({
    receiver: req.user._id,
  })
    .populate('sender', 'firstName lastName email photo coverPhoto isOnline')
    // .populate('payload.roomId')
    // .populate('payload.eventId')
    // .populate('receiver')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalCount = await Notification.countDocuments({
    receiver: req.user._id,
  });

  // SEEN all notifications
  await Notification.updateMany(
    {
      seen: false,
      receiver: req.user._id,
      createdAt: { $gte: req.user.lastLogin },
    },
    { seen: true },
    { new: true }
  );

  res.status(200).json({
    status: 'success',
    totalCount,
    results: notfs.length,
    newNotifications,
    data: notfs,
  });
});

exports.createNotification = async (pushNotificationObject, obj) => {
  let imageUrl = '';

  if (pushNotificationObject?.fcmToken?.length > 0) {
    // if (req) imageUrl = `${req.protocol}://${req.get('host')}/img/logo.png`;
    // else imageUrl = `${process.env.BACKEND_URL}/img/logo.png`;

    admin
      .messaging()
      .sendMulticast({
        notification: {
          title: pushNotificationObject?.title || 'Hr Management!!',
          body: obj.message,
          // imageUrl,
          imageUrl:
            'https://i.pinimg.com/736x/f0/42/ad/f042ada5fe30d167bc6a9b0c0fc0a60e.jpg',
        },
        tokens: pushNotificationObject.fcmToken,
      })
      .then((response) => console.log('notification sent!'));
  }

  let notf = await Notification.create(obj);

  notf.receiver = notf.receiver._id;

  if (obj?.socket) {
    io.getIO().emit('new-notification', notf);
  }
};

exports.createManyNotification = async (req, ArrayObjs) => {
  // req.body.read_by = req?.user?._id;
  await Notification.insertMany(ArrayObjs);
};

exports.deleteNotification = factory.deleteOne(Notification);
exports.updateNotification = factory.updateOne(Notification);
