const mongoose = require('mongoose')

const briefingLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['morning', 'evening', 'panic_check'], default: 'morning' },
  content: String,
  tasksIncluded: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  deliveredVia: [String]
}, { timestamps: true })

module.exports = mongoose.model('BriefingLog', briefingLogSchema)
