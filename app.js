// let searchQuery = 'ttt "@gmail.com" "@outlook.com" "@yahoo.com"'
// Method: start()
// parameters 1: Google search query to find emails
// parameters 2: Google Page number to start
// parameters 3: Google Page number to end
// parameters 4: List file name to save emails
// Note: Don't query to many pages at once. Query 1 to 5 than 6 - 10 and so on. Google will block you if you query to much at once.

const fs = require('fs')
var lineReader = require('line-reader');
const BAEmailScraper = require("./controllers/scraper.js");
// const mongoose = require('mongoose')
// const mongo_url = 'mongodb://admin:Z9PebEmail@ds113873.mlab.com:13873/emaildb'
// mongoose.Promise = global.Promise
// mongoose.connect(mongo_url, {useNewUrlParser: true})
// mongoose.connection.on('error', err => {
// 	if(error) console.log('error ' + err)
// })
// mongoose.connection.on('connected', connected => console.log('Mongoose connected'))
// mongoose.connection.on('error', error => console.log('Mongoose error ' + error))
// mongoose.connection.on('disconnected', disconnected => console.log("Mongoose disconnected"))
// mongoose.set('useCreateIndex', true)

// const Emails = require('./models/emails')

// Emails.find({"emails": "test"}, (err, res) => {
// 	if(err) return console.log('err' + err)
// 	if(!res.length) return console.log('Could not find request ' + res)

// 	console.log('Found request ' + res)
// })


// let emailList = new Emails({
// 	list: {
// 		num: 1,
// 		emails: ['test', 'test2', 2, 3],
// 		queue: 1,
// 		lastEmail: 'test@test.com'
// 	}
// })

// emailList.save( (err, email) => {
// 	if(err) return console.log(err)
// 	console.log(email)
// })


if(process.argv[2] == null )
	return console.log('Hey there cowboy, might want to enter in a keyword hey. You lil bitch.')


// fs.writeFile('temp.txt', (err, buff) => {
// 	console.log(buff.toString())
// })


async function run(){
	// lineReader.eachLine('genkeywords.txt', async function(line, last) {
	//   console.log(line);

	//   let searchQuery = `${line} "@gmail.com" "@outlook.com"`
	//   await BAEmailScraper.start(searchQuery, 1, 3, "myEmailList.txt"); 
	//   console.log('1')
	//   // do whatever you want with line...
	//   if(last){
	//     // or check if it's the last one
	//     console.log('2')
	//   }
	// });



	// or read line by line:
	lineReader.open('genkeywords.txt', function(err, reader) {
	  if (err) throw err;
	  setInterval(() => {
	  	  if (reader.hasNextLine()) {
	  		    reader.nextLine(async function(err, line) {
	  		      try {
	  				if (err) throw err;

	  				let searchQuery = `${line} "@gmail.com" "@outlook.com"`
	  				await BAEmailScraper.start(searchQuery, 1, 3, "myEmailList.txt"); 

	  		        console.log(line);
	  		      } finally {
	  		        reader.close(function(err) {
	  		          if (err) throw err;          
	  		        });
	  		      }

	  		    });
	  	  }
	  	  else {
	  	    reader.close(function(err) {
	  	      if (err) throw err;          
	  	    });
	  	  }
	  	}, 60000)

	});







	console.log('3')
}

run()


// let searchQuery = `${process.argv[2]} "@gmail.com" "@outlook.com"`
// BAEmailScraper.start(searchQuery, 1, 3, "myEmailList.txt");

// console.log(searchQuery)