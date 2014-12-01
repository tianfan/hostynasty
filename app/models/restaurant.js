var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var RestaurantSchema = new Schema({
    name: String,
    location: { streetAddress: String, latitude: Number, Longitude: Number},
    city: { name: String, url: String, province: String, health_auth: String},
    number: String,
    type: String,
    months_open: String,
    foodsafe: Boolean,
    health_auth: String,
    url: String,
    inspections: [{ type: String, date: Date, num_critical: Number, num_non_critical: Number, violations: [{code: String, Description: String, Comments: String}]}]
});

module.exports = mongoose.model('Restaurant', RestaurantSchema);
