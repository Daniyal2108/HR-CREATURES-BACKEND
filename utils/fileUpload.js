const S3 = require('aws-sdk/clients/s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const AppError = require('./appError');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const fileBucket = process.env.AWS_IMAGE_BUCKET_NAME;
// const pdfBucket = process.env.AWS_PDF_BUCKET_NAME;
const pdfBucket = process.env.AWS_IMAGE_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

const s3 = new S3({
  region,
  accessKeyId,
  secretAccessKey,
});

// const uploadImage = multer({
//   storage: multerS3({
//     s3: s3,
//     bucket: fileBucket,
//     metadata: function (req, file, cb) {
//       cb(null, { fieldName: file.fieldname });
//     },
//     key: function (req, file, cb) {
//       let type;
//       if (req?.body?.filetype == 'pdf') type = 'pdf';
//       else if (req?.body?.filetype == 'video') type = 'mp4';
//       else if (file?.mimetype == 'image/svg+xml') type = 'svg';
//       else if (file?.mimetype == 'image/jpg') type = 'jpg';
//       else if (file?.mimetype == 'image/jpeg') type = 'jpeg';
//       else if (file?.mimetype == 'image/png') type = 'png';
//       cb(null, `${uuidv4()}.${type}`);
//     },
//   }),
//   // limits: { fileSize: 3000000 }, // In bytes: 2000000 bytes = 3 MB
//   fileFilter: multerPdfFilter,
// });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  },
});

const uploadImage = (req, file, cb) => {
  if (file.mimetype.split('/')[0] === 'image') {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed!'));
  }
};

exports.uploadUserImage = multer({
  storage,
  fileFilter: uploadImage,
}).fields([
  {
    name: 'images',
    maxCount: 20,
  },
  {
    name: 'video',
    maxCount: 1,
  },
]);

exports.getUploadingSignedURL = async (Key, Expires = 15004) => {
  try {
    const url = await s3.getSignedUrlPromise('putObject', {
      Bucket: fileBucket,
      Key: Key,
      Expires,
    });
    return url;
  } catch (error) {
    return error;
  }
};

function getFileStream(fileKey) {
  const downloadParams = {
    Key: fileKey,
    Bucket: fileBucket,
  };

  return s3.getObject(downloadParams).createReadStream();
}
exports.getFileStream = getFileStream;

exports.deleteFile = (fileKey) => {
  const deleteParams = {
    Key: fileKey,
    Bucket: fileBucket,
  };

  return s3.deleteObject(deleteParams).promise();
};

function getPDFFileStream(fileKey) {
  const downloadParams = {
    Key: fileKey,
    Bucket: pdfBucket,
  };

  return s3.getObject(downloadParams).createReadStream();
}
exports.getPDFFileStream = getPDFFileStream;
