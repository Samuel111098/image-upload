var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/images');
var Schema = mongoose.Schema;

var imageSchema = new Schema({
	image: Buffer
});

module.exports = mongoose.model('image', imageSchema);
