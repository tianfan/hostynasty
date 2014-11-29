var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var InspectionSchema = new Schema({
    type: String,
    url: String,
    date: Date,
    hazard_rating: String,
    num_critical: Number,
    num_non_critical: Number,
    violations: [{code: String, Description: String, Comments: String}]
});

module.exports = mongoose.model('Inspection', InspectionSchema);
