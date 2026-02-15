const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...', err);
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const dbPassword = encodeURIComponent(process.env.DATABASE_PASSWORD || '');
const dbTemplate = process.env.DATABASE || '';
const DB = dbTemplate.includes('<PASSWORD>')
  ? dbTemplate.replace('<PASSWORD>', dbPassword)
  : dbTemplate;
mongoose
  .connect(DB, {
    useNewUrlParser:
      DB.startsWith('mongodb+srv://') || !DB.includes(','),
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => {
    const port = process.env.PORT || 3000;
    const server = app.listen(port, () => {
      console.log(`App running on port ${port}...`);
    });

    console.log('DB connection successful!');
  });

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  // server.close(() => {
  //   process.exit(1);
  // });
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  // server.close(() => {
  //   console.log('💥 Process terminated!');
  // });
});
