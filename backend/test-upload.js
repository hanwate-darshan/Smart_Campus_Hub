require('dotenv').config();
const { uploadToCloudinary } = require('./src/utils/cloudinary');
const fs = require('fs');
const path = require('path');

async function test() {
  try {
    // Generate a 1x1 valid transparent PNG buffer
    const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    const result = await uploadToCloudinary(buffer, 'smart-campus/test');
    console.log('Success:', result);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
