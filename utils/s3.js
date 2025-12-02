const S3 = require('aws-sdk/clients/s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const AppError = require('./appError');

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

const multerPdfFilter = (req, file, cb) => {
  let extension = file.mimetype.split('/')[1];
  let mimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/svg+xml',
    'video/mp4',
    'application/pdf'
  ];
  if (
    // file.mimetype.startsWith('image') ||
    // file.mimetype.startsWith('video')
    mimeTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(new AppError(`Invalid file type ${extension}`, 400), false);
  }
};

const uploadPDfs = multer({
  storage: multerS3({
    s3: s3,
    bucket: pdfBucket,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, `${uuidv4()}-pdf`);
    },
  }),
  limits: { fileSize: 3000000 }, // In bytes: 3000000 bytes = 3 MB
  fileFilter: multerPdfFilter,
});

exports.uploadUserPDfs = uploadPDfs.fields([
  {
    name: 'documents',
    maxCount: 4,
  },
  {
    name: 'pdf',
    maxCount: 1,
  },
]);

const uploadImage = multer({
  storage: multerS3({
    s3: s3,
    bucket: fileBucket,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      let type;
      if (req?.body?.filetype == 'pdf') type = 'pdf';
      else if (req?.body?.filetype == 'video') type = 'mp4';
      else if (file?.mimetype == 'image/svg+xml') type = 'svg';
      else if (file?.mimetype == 'image/jpg') type = 'jpg';
      else if (file?.mimetype == 'image/jpeg') type = 'jpeg';
      else if (file?.mimetype == 'image/png') type = 'png';
      else if (file?.mimetype == 'application/pdf') type = 'pdf';
      cb(null, `${uuidv4()}.${type}`);
    },
  }),
  // limits: { fileSize: 3000000 }, // In bytes: 2000000 bytes = 3 MB
  fileFilter: multerPdfFilter,
});

exports.uploadUserImage = uploadImage.fields([
  {
    name: 'photo',
    maxCount: 1,
  },
  {
    name: 'uploadCv',
    maxCount: 1,
  },
  {
    name: 'experienceLetter',
    maxCount: 1,
  },
  {
    name: 'offerLetter',
    maxCount: 1,
  },
  {
    name: 'degree',
    maxCount: 1,
  },
  {
    name: 'otherCertificate',
    maxCount: 1,
  },
  {
    name: 'terminationOrResignationLetter',
    maxCount: 1,
  },
  {
    name: 'certificate',
    maxCount: 1,
  },
  {
    name: 'inteviewRemarksForm',
    maxCount: 1,
  },
  {
    name: 'preInterviewForm',
    maxCount: 1,
  },
  {
    name: 'clearanceLetter',
    maxCount: 1,
  },
  {
    name: 'document',
    maxCount: 1,
  }
]);
/* 
// uploads a file to s3
function uploadFile(file) {
  const fileStream = fs.createReadStream(file.path);

  const uploadParams = {
    Bucket: bucketName,
    Body: fileStream,
    Key: file.filename,
  };

  return s3.upload(uploadParams).promise();
}
exports.uploadFile = uploadFile;
 */
// downloads a file from s3

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
