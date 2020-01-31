var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const multer = require('multer');
const mongoose = require('mongoose');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

const mongoURI = 'mongodb://localhost:27017/images';
const conn = mongoose.createConnection(mongoURI);
const data = require('./modules/data');
const image = require('./modules/image');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

let gfs;
conn.once('open', () => {
	gfs = new mongoose.mongo.GridFSBucket(conn.db, {
		bucketName: 'image'
	});
});

// Create storage engine
const storage = new GridFsStorage({
	url: mongoURI,
	file: (req, file) => {
		return new Promise((resolve, reject) => {
			const filename = file.originalname;
			const fileInfo = {
				filename: req.body.title,
				bucketName: 'image'
			};
			resolve(fileInfo);
		});
	}
});

const upload = multer({ storage });

app.get('/images', (req, res) => {
	res.render('form');
});

app.post('/upload', upload.single('image'), (req, res) => {
	image.create({
		image: req.file
	});
	data.create({
		title: req.body.title,
		description: req.body.description
	});
	res.redirect('/images');
});

// get / page
app.get('/viewimages', (req, res) => {
	if (!gfs) {
		console.log('some error occured, check connection to db');
		res.send('some error occured, check connection to db');
		process.exit(0);
	}
	gfs.find().toArray((err, files) => {
		// check if files
		if (!files || files.length === 0) {
			return res.render('view', {
				files: false
			});
		} else {
			const f = files
				.map((file) => {
					if (file.contentType === 'image/png' || file.contentType === 'image/jpeg') {
						file.isImage = true;
					} else {
						file.isImage = false;
					}
					return file;
				})
				.sort((a, b) => {
					return new Date(b['uploadDate']).getTime() - new Date(a['uploadDate']).getTime();
				});

			return res.render('view', {
				files: f
			});
		}

		// return res.json(files);
	});
});

app.get('/viewimages', (req, res) => {
	res.render('view');
});

app.get('/files', (req, res) => {
	gfs.find().toArray((err, files) => {
		// check if files
		if (!files || files.length === 0) {
			return res.status(404).json({
				err: 'no files exist'
			});
		}

		return res.json(files);
	});
});

app.get('/files/:filename', (req, res) => {
	gfs.find(
		{
			filename: req.params.filename
		},
		(err, file) => {
			if (!file) {
				return res.status(404).json({
					err: 'no files exist'
				});
			}

			return res.json(file);
		}
	);
});

app.get('/image/:filename', (req, res) => {
	// console.log('id', req.params.id)
	const file = gfs
		.find({
			filename: req.params.filename
		})
		.toArray((err, files) => {
			if (!files || files.length === 0) {
				return res.status(404).json({
					err: 'no files exist'
				});
			}
			gfs.openDownloadStreamByName(req.params.filename).pipe(res);
		});
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});
app.listen(4000);

module.exports = app;
