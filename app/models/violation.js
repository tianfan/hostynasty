var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ViolationSchema = new Schema({
    code: String,
    description: String,
    comments: String
});

module.exports = mongoose.model('Violation', ViolationSchema);
