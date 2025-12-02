const Vacancy = require('../models/vacancyModel');
const moment = require('moment');

exports.vacancyExpire = async () => {
  console.log("Vacancy Expire Cron")
  const date = moment().format();

  await Vacancy.updateMany(
    {
      isActive: true,
      status:'Active',
      lastDateOfApply: {
        $lte: new Date(date),
      },
    },
    {
      $set: {
        status: 'Expired',
      },
    }
  );
};