const path = require('path');
const express = require('express');
const schedule = require('node-schedule');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
// const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');
const moment = require('moment');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const userRouter = require('./routes/userRoutes');
const notificationRouter = require('./routes/notificationRoutes');
const vacancyRouter = require('./routes/vacancyRoutes');
const questionTemplateRouter = require('./routes/questionaireTemplateRoutes');
const vacancyTemplateRouter = require('./routes/vacancyTemplateRoutes');
const departmentRouter = require('./routes/departmentRoutes');
const resultRouter = require('./routes/resultRoutes');
const imageRouter = require('./routes/imageRoutes');
const employeeRouter = require('./routes/employeeRoutes');
const leaveRouter = require('./routes/leaveRoutes');
const attendanceRouter = require('./routes/attendanceRoutes');
const payrollRouter = require('./routes/payrollRoutes');
const performanceReviewRouter = require('./routes/performanceReviewRoutes');
const employeeDocumentRouter = require('./routes/employeeDocumentRoutes');
const hrReportsRouter = require('./routes/hrReportsRoutes');

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const User = require('./models/userModel');

const { getFileStream, getPDFFileStream } = require('./utils/s3');

const { vacancyExpire } = require('./utils/cronFns');

// Start express app
const app = express();
const http = require('http').Server(app);

app.enable('trust proxy');

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// PUG CONFIG
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// EJS CONFIG
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/public', '/templates'));

// 1) GLOBAL MIDDLEWARES
app.use(cors());

app.options('*', cors());
// app.options('/api/v1/tours/:id', cors());

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

app.use(compression());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

app.use(
  '/staycationar-api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument)
);

// 3) ROUTES
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to Hr Management System APIs',
  });
});

app.get('/payment-thankyou', (req, res) => {
  res.render('paymentThankYouScreen');
});

app.get('/booking-in-process', (req, res) => {
  res.render('bookingInProcessScreen');
});

// AWS READ FILES

app.get('/api/pdf/:key', async (req, res, next) => {
  const key = req.params.key;

  let _err = 1;

  // Content-type: application/pdf
  res.header('Content-type', 'application/pdf');
  const readStream = getPDFFileStream(key).on('error', (e) => {
    _err = 0;
    return res.status(404).json({
      message: 'Image not Found.',
    });
  });

  if (_err) readStream.pipe(res);
});

// read images
app.get('/api/images/:key', async (req, res) => {
  try {
    const key = req.params.key;

    if (req?.query?.type == 'pdf' || key?.split('.')[1] == 'pdf')
      res.header('Content-type', 'application/pdf');
    else if (key?.split('.')[1] == 'svg')
      res.set('Content-type', 'image/svg+xml');
    else if (key?.split('.')[1] == 'mp4') res.set('Content-type', 'video/mp4');
    else res.set('Content-type', 'image/gif');

    // const readStream = await
    await getFileStream(key)
      .on('error', (e) => {
        // return res.status(404).json({
        //   message: 'Image not Found.',
        // });
      })
      .pipe(res);
  } catch (e) {
    return res.status(404).json({
      message: 'Image not found',
    });
  }
});

app.use('/api/v1/users', userRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/vacancies', vacancyRouter);
app.use('/api/v1/questionaire-templates', questionTemplateRouter);
app.use('/api/v1/vacancy-templates', vacancyTemplateRouter);
app.use('/api/v1/department', departmentRouter);
app.use('/api/v1/result', resultRouter);
app.use('/api/v1/image', imageRouter);
app.use('/api/v1/employees', employeeRouter);
app.use('/api/v1/leaves', leaveRouter);
app.use('/api/v1/attendance', attendanceRouter);
app.use('/api/v1/payroll', payrollRouter);
app.use('/api/v1/performance-reviews', performanceReviewRouter);
app.use('/api/v1/employee-documents', employeeDocumentRouter);
app.use('/api/v1/hr-reports', hrReportsRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

schedule.scheduleJob('0 * * * *', async () => {
  // RUNNING ON EVERY HOUR
  try {
    await Promise.all([vacancyExpire()]);
  } catch (error) {
    // console.log(error);
  }
});

module.exports = http;
