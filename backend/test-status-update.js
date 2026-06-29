require('dotenv').config();
const mongoose = require('mongoose');
const { updateComplaintStatus } = require('./src/modules/complaint/complaint.service');
const Complaint = require('./src/models/Complaint.model');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  try {
    const complaint = await Complaint.findOne({ status: 'submitted' });
    if (!complaint) {
      console.log('No submitted complaint found');
      process.exit(0);
    }
    console.log('Updating complaint:', complaint._id);
    
    // Simulate teacher updating
    const result = await updateComplaintStatus({
      complaintId: complaint._id,
      newStatus: 'in_progress',
      comment: 'Testing status update',
      updatedBy: new mongoose.Types.ObjectId(), // fake teacher id
      updatedByRole: 'teacher',
      updatedByName: 'Test Teacher'
    });
    console.log('Success:', result.status);
  } catch (err) {
    console.error('FAILED:', err);
  }
  process.exit(0);
}

run();
