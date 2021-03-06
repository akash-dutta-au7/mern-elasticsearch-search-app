const { Content } = require('../models/contentSchema');
const cloudinary = require('cloudinary').v2;
const elastic = require('elasticsearch');

const elasticClient = elastic.Client({
	host: 'localhost:9200',
});

/** Elastic Search
 */
exports.ElasticIndex = (req, res, next) => {
	elasticClient
		.index({
			index: 'logs',
			body: {
				url: req.url,
				method: req.method,
			},
		})
		.then((res) => {
			console.log('Logs indexed');
		})
		.catch((err) => {
			console.log(err);
		});
	next();
};
exports.SearchContent = async (req, res) => {
	let query = {
		// The db that got indexed with mongodb
		index: 'contents',
	};
	/** You can customize the query parameters here*/
	if (req.query.content) query.q = `*${req.query.content}*`;
	elasticClient
		.search(query)
		.then((resp) => {
			return res.status(200).json({
				contents: resp.hits.hits,
			});
		})
		.catch((err) => {
			console.log(err);
			return res.status(500).json({
				msg: 'Error',
				err,
			});
		});
};

exports.getAllContent = async (req, res) => {
	const skip = req.query.skip ? Number(req.query.skip) : 0;
	const DEFAULT_LIMIT = 10;
	try {
		// const contents = await Content.find();
		const contents = await Content.find({}).skip(skip).limit(DEFAULT_LIMIT);
		res.status(200).json({
			status: 'Success',
			Total: contents.length,
			contents,
		});
	} catch (err) {
		res.status(400).json({
			status: 'Error',
			err: err.message,
		});
	}
};

exports.getContentById = async (req, res) => {
	try {
		const content = await Content.findById(req.params.id);
		res.status(200).json({
			status: 'Success',
			content,
		});
	} catch (err) {
		res.status(400).json({
			status: 'Error',
			err: err.message,
		});
	}
};

exports.createContent = async (req, res) => {
	try {
		const notes = req.body.notes;
		const title = req.body.title;
		const tags = req.body.tags;

		const newContent = new Content({
			title,
			tags,
			notes,
		});
		const content = await newContent.save();
		content.on('es-indexed', (err, result) => {
			console.log('indexed to elastic search');
		});
		res.status(201).json({
			status: 'Success',
			message: 'Content successfully added to DB',
			content,
		});
	} catch (err) {
		res.status(400).json({
			status: 'Error',
			err: err.message,
		});
	}
};

exports.updateContent = async (req, res) => {
	try {
		const content = await Content.findById(req.params.id);

		if (!content) return res.status(404).json({ Error: 'Contact not found' });

		await content.update(req.body, {
			new: true,
		});

		res.status(200).json({
			msg: 'Contact updated successfully',
		});
	} catch (err) {
		res.status(400).json({
			status: 'Error',
			err: err.message,
		});
	}
};

exports.deleteContent = async (req, res) => {
	try {
		const content = await Content.findById(req.params.id);

		if (!content) return res.status(404).json({ msg: 'Post Not Found' });
		await content.remove();
		res.json({
			msg: 'Contact successfully deleted ',
			id: req.params.id,
		});
	} catch (err) {
		res.status(400).json({
			status: 'Error',
			err: err.message,
		});
	}
};


