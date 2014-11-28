var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CitySchema = new Schema({
    name: String,
    province: String,
    health_auth: String,
    url: String
});

module.exports = mongoose.model('City', CitySchema);
