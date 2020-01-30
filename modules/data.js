var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/images');
var Schema = mongoose.Schema;

var dataSchema = new Schema({
	title: String,
	description: String
});

module.exports = mongoose.model('data', dataSchema);
