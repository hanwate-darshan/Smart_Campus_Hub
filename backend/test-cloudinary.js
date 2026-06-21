require('dotenv').config();
const { uploadToCloudinary } = require('./src/utils/cloudinary');
const fs = require('fs');

async function test() {
  try {
    const buffer = Buffer.from('test image content');
    const result = await uploadToCloudinary(buffer, 'smart-campus/test');
    console.log('Success:', result);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
