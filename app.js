const fs = require('fs')
var lineReader = require('line-reader');
const BAEmailScraper = require("./controllers/scraper.js");
const sleep = require('delay');
const mongoose = require('mongoose')
const dotenv = require('dotenv').config()

const mongo_url = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}`

mongoose.Promise = global.Promise
mongoose.connect(mongo_url, {useNewUrlParser: true})
mongoose.connection.on('error', err => {
	if(error) console.log('error ' + err)
})
mongoose.connection.on('connected', connected => console.log('Mongoose connected'))
mongoose.connection.on('error', error => console.log('Mongoose error ' + error))
mongoose.connection.on('disconnected', disconnected => console.log("Mongoose disconnected"))
mongoose.set('useCreateIndex', true)

const Emails = require('./models/emails')

if (process.env.RATE_LIMIT === 'true'){
	console.log('rate limit enabled')
}


async function getQueNum(){
	let findList = await Emails.findOne({'listId': process.env.MAILTRAIN_LIST_ID}, (err, res) => {
		if(err !== null || res == null) return console.log('error ' + err)
	})

	return findList['queue']
}

async function setQueNum(num){
	let res = await Emails.findOneAndUpdate({'listId': process.env.MAILTRAIN_LIST_ID}, {'queue': num}, async (err, res) => {
	    if(err !== null || res == null) return console.log('error ' + err)
	})

	return res['queue']
}


async function tests(){

	console.log(await getQueNum())
	console.log(await setQueNum(350))
	console.log(await getQueNum())

}

// tests()

async function run(){
	async function get_line(filename, line_no, callback) {
	    fs.readFile(filename, function (err, data) {
	      if (err) throw err;

	      // Data is a buffer that we need to convert to a string
	      // Improvement: loop over the buffer and stop when the line is reached
	      var lines = data.toString('utf-8').split("\n");

	      if(+line_no > lines.length){
	        return callback('File end reached without finding line', null);
	      }

	      callback(null, lines[+line_no]);
	    });
	}

	// return

	async function runner(){
		let queNum = await getQueNum()
		queNum = parseInt(queNum)

		get_line(process.env.KEYWORDS_FILE, queNum, async function(err, line){

			console.log('The line: ' + line);
			let searchQuery = `${line} "@gmail.com" "@outlook.com"`

			await BAEmailScraper.start(searchQuery, 1, 3, "myEmailList.txt"); 

			let incQue = queNum + 1
			console.log(incQue)

			await setQueNum(incQue)

		})
	}

	runner()


	setInterval(() => {
		runner()
	}, 12000)

	console.log('3')
}

run()