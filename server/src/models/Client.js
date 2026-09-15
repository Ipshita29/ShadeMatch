const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    photoUrl: { type: String, required: true },
    photoPublicId: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Client', clientSchema);
