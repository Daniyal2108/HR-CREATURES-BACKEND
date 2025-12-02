const aws = require('aws-sdk');
const {
  AWS_ACCESS_KEY,
  AWS_SECRET_KEY,
  AWS_BUCKET_REGION,
  AWS_IMAGE_BUCKET_NAME,
} = process.env;

aws.config.update({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY,
  region: AWS_BUCKET_REGION,
});
const s3 = new aws.S3();

exports.uploads = async (key, data) => {
  return new Promise((resolve, reject) => {
    try {
      const params = {
        Bucket: AWS_IMAGE_BUCKET_NAME, // pass your bucket name
        Key: key, // file will be saved as testBucket/contacts.csv
        Body: data,
      };

      s3.upload(params, (err, result) => {
        if (err) reject({ status: 400, success: false, message: err.message });
        resolve(result);
      });
    } catch (err) {
      reject({ status: 500, success: false, message: err.message });
    }
  });
};

exports.remove = (key) => {
  return new Promise((resolve, reject) => {
    try {
      const params = {
        Bucket: AWS_IMAGE_BUCKET_NAME,
        Key: key,
      };
      s3.deleteObject(params, (err, data) => {
        if (err) {
          reject({ status: 400, success: false, message: err.message });
        }
        resolve(true);
      });
    } catch (error) {
      reject({ status: 500, success: false, message: err.message });
    }
  });
};

exports.removeVideo = (cloudinaryId) => {
  return new Promise((resolve, reject) => {
    try {
      if (cloudinaryId) {
        cloudinary.v2.uploader.destroy(
          cloudinaryId,
          { resource_type: 'video' },
          (result) => {
            resolve();
          }
        );
      } else reject({ message: 'An error occurred while removing the Video.' });
    } catch (error) {
      reject(error.message);
    }
  });
};
