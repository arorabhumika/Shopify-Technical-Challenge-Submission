const express = require('express');
const bodyParser = require('body-parser')
const app = express();
const MongoClient = require('mongodb').MongoClient
const ObjectId = require('mongodb').ObjectId;
const { ReturnDocument } = require('mongodb');
const connectionString = "mongodb+srv://bhumika:p;d6PAPptcYECmx@cluster0.bqm6e.mongodb.net/myFirstDatabase?retryWrites=true&w=majority"

function checkIfPositiveNumber(product, key) {
	if (product[key] && !parseInt(product[key])) {
		return { isValid: false, reason: "Please enter integer for " + key };
	}
	if (parseInt(product[key]) < 0) {
		return { isValid: false, reason: "Please enter positive integer for " + key };
	}
	return { isValid: true, reason: "" };
}

function validatePositiveKeys(product) {
	const numericKeys = ["stock", "incoming_stock"];
	for (let key of numericKeys) {
		let { isValid, reason } = checkIfPositiveNumber(product, key);
		if (!isValid) {
			return { isValid, reason }
		}
	}
	return { isValid: true, reason: "" };
}

function validateProduct(product) {
	let { isValid, reason } = validatePositiveKeys(product);
	if (!isValid) {
		return { isValid, reason }
	}
	if (!product["name"]) {
		return { isValid: false, reason: "Please provide a name" };
	}

	return { isValid: true, reason: "" };
}


MongoClient.connect(connectionString, { useUnifiedTopology: true })
	.then(client => {
		console.log('Connected to Database')
		const db = client.db('my-db')
		const inventoryCollection = db.collection('inventory');

		app.set('view engine', 'ejs')
		app.use(bodyParser.urlencoded({ extended: true }))

		app.listen(3000, function () {
			console.log('listening on 3000')
		})

		app.get('/', (req, res) => {
			inventoryCollection.find().toArray()
				.then(results => {
					res.render('index.ejs', { inventory: results })
				})
				.catch(error => console.error(error))


		})
		app.post('/insertItem', (req, res) => {
			let { isValid, reason } = validateProduct(req.body);
			if (!isValid) {
				res.status(400).send({ message: reason });
				return;
			}
			inventoryCollection.insertOne(req.body)
				.then(result => {
					res.redirect('/')
				})
				.catch(error => {
					console.error(error);
					res.status(400).send({ message: "Unable to add to the database." });
				})
		})

		// req.body
		// name, code, stock, incoming stock
		app.post('/editItem', (req, res) => {
			let { isValid, reason } = validatePositiveKeys(req.body);
			if (!isValid) {
				res.status(400).send({ message: reason });
				return;
			}
			try {
				inventoryCollection.findOneAndUpdate(
					{ _id: ObjectId(req.body.code) }, { $set: { stock: req.body.stock, incoming_stock: req.body.incoming_stock } }
				)
					.then(result => {
						if (result.lastErrorObject.updatedExisting) {
							res.redirect('/')
						} else {
							res.status(400).send({ message: "Unable to find the product in the database." });
						}
					})
					.catch(error => {
						console.log("Error");
						console.error(error);
						res.status(400).send({ message: "Unable to find the product in the database." });
					})
			} catch (error) {
				res.status(400).send({ message: "Internal error" });
			}
		})

		app.post('/deleteItem', (req, res) => {
			try {
				inventoryCollection.findOneAndUpdate(
					{ _id: ObjectId(req.body.code) }, { $set: { isDeleted: true, reason_delete: req.body.comment } }
				)
					.then(result => {
						if (result.lastErrorObject.updatedExisting) {
							res.redirect('/')
						} else {
							res.status(400).send({ message: "Unable to find the product in the database." });
						}
					})
					.catch(error => {
						console.error(error);
						res.status(400).send({ message: "Unable to find the product in the database." });
					}
					)
			} catch (error) {
				res.status(400).send({ message: "Internal error" });
			}
		})

		app.post('/restoreItem', (req, res) => {
			try {
				inventoryCollection.findOneAndUpdate(
					{ _id: ObjectId(req.body.code) }, { $set: { comment: "", isDeleted: false } }
				)
					.then(result => {
						if (result.lastErrorObject.updatedExisting) {
							res.redirect('/')
						} else {
							res.status(400).send({ message: "Unable to find the product in the database." });
						}
					})
					.catch(error => {
						console.error(error);
						res.status(400).send({ message: "Unable to find the product in the database." })
					})
			} catch (error) {
				res.status(400).send({ message: "Internal error" });
			}
		})
	})
	.catch(console.error)