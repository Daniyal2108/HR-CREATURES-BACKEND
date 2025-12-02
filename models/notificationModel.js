const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // Notification creator
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // required: [true, 'Notification creator id is required.'],
    },
    senderMode: {
      type: String,
      enum: ['admin', 'hr', 'manager', 'employee'],
      // required: [true, 'sender mode is required.'],
    },
    seen: {
      type: Boolean,
      default: false,
    },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department'},
    noticationType: {
      type: String,  
      enum:['routine-notification','special-announcement']
    },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Ids of the receivers of the notification
    // receiver: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Ids of the receivers of the notification
    message: { type: String, required: [true, 'message is required.'] }, // any description of the notification message
    title: { type: String }, // any title description of the notification message
    link: String,
  },
  { timestamps: true }
);

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;

/*
    __________FACEBOOK__________
{
    status: 'connected',
    authResponse: {
    accessToken: '{access-token}',
    expiresIn:'{unix-timestamp}',
    reauthorize_required_in:'{seconds-until-token-expires}',
    signedRequest:'{signed-parameter}',
    userID:'{user-id}'
  }
}

*/
