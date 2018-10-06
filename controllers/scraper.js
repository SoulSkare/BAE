exports.start = function(query, googlePageToStartFrom, maxGooglePage, fileName) {
    var request = require("request");
    const sleep = require('delay');
    const dotenv = require('dotenv').config()

    var Config = require("../controllers/config.js");
    var domainsToSave = Config.domains();

    var currentPage = 0;
    var extractedEmailsArray = [];

    function queryGoogle(page) {
        currentPage = page;

        var options = {
            url: "http://www.google.com/search?q="+query+'&start='+page*10,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36'
            },
            timeout: Config.settings().reqestTimeOut
        };

        function requestCallback(error, response, body) {
            if (error) {
                console.error("Google Request error.");
                getUrls("");
            } else {
                if (response.statusCode === 200) {
                    getUrls(body);
                } else {
                    if (response.statusCode === 503) {
                        console.error("Blocked by Google try after a couple of hours.");
                        console.error("NOTE: Don't query a lot of pages at once.");
                        return;
                    } else {
                        getUrls("");
                    }
                }
            }
        }
        request(options, requestCallback);
    }
    queryGoogle(googlePageToStartFrom-1);

    async function getUrls(text) {
        console.info("Google Page "+(currentPage+1));

        var urlsToQuery = 0;
        var callbacksMade = 0;

        if (text === "") {
            if (currentPage < maxGooglePage-1) {
                await queryGoogle(currentPage+1);
            } else {
                console.log("Extracting complete. "+extractedEmailsArray.length+" total emails found.");
            }

            return;
        }

        var urlRegex = /(https?:\/\/[^\s]+)/g;
        text.replace(urlRegex, function(url) {
            if (url.indexOf("&amp;") !== -1) {
                var _url = url;
                if (!_url.includes("://webcache") && !_url.includes("://maps.google") && !_url.includes("/dumps/")) {
                    if (_url.slice(0, url.indexOf("&amp;")) !== "") {
                        urlsToQuery = urlsToQuery + 1;
                        
                        var finalUrl = _url.slice(0, url.indexOf("&amp;"));
                        
                        queryUrls(finalUrl, function(url) {
                            callbacksMade = callbacksMade + 1;

                            if (callbacksMade === urlsToQuery) {
                                console.error("Extracting complete. "+parseInt(callbacksMade*100/urlsToQuery)+"%");
                                console.log(extractedEmailsArray.length+" total emails found.");

                                if (currentPage < maxGooglePage-1) {
                                    queryGoogle(currentPage+1);
                                } else {
                                    console.log("Extracting complete. "+extractedEmailsArray.length+" total emails found.");
                                }
                            } else {
                                console.log("Extracting emails... "+parseInt(callbacksMade*100/urlsToQuery)+"%");
                            }
                        });
                    }
                }   
            }
        });
    }

    function queryUrls(url, callback) {
        var extractedEmailsString = "";

        var options = {
            url: url,
            headers: {
                'User-Agent': 'request'
            },
            timeout: Config.settings().reqestTimeOut
        };

        async function requestCallback(error, response, body) {
            if (error) {
                await extractEmails("error");
                console.error("Request error.");
            } else {
                if (response.statusCode === 200) {
                    await extractEmails(body);
                } else {
                    await extractEmails("error");
                    // console.error(response.statusCode);
                }
            }
        }
        request(options, requestCallback);

        function ranNum(min, max) {
            return Math.random() * (max - min) + min;
        }

        // let ranNumber = Math.round(ranNum(1000, 20000))
        // setInterval(() =>{
        //     ranNumber = Math.round(ranNum(1000, 20000))
        //     //console.log(ranNumber)
        // }, 500)

        var RateLimit = (function() {
          var RateLimit = function(maxOps, interval, allowBursts) {
            this._maxRate = allowBursts ? maxOps : maxOps / interval;
            this._interval = interval;
            this._allowBursts = allowBursts;

            this._numOps = 0;
            this._start = new Date().getTime();
            this._queue = [];
          };

          RateLimit.prototype.schedule = function(fn) {
            var that = this,
                rate = 0,
                now = new Date().getTime(),
                elapsed = now - this._start;

            if (elapsed > this._interval) {
              this._numOps = 0;
              this._start = now;
            }

            rate = this._numOps / (this._allowBursts ? 1 : elapsed);

            if (rate < this._maxRate) {
              if (this._queue.length === 0) {
                this._numOps++;
                fn();
              }
              else {
                if (fn) this._queue.push(fn);

                this._numOps++;
                this._queue.shift()();
              }
            }
            else {
              if (fn) this._queue.push(fn);

              setTimeout(function() {
                that.schedule();
              }, 1 / this._maxRate);
            }
          };

          return RateLimit;
        })();


        async function sendToEmailList(email){
            const axios = require('axios')

            await axios('http://' + process.env.MAILTRAIN_HOST_ADDRESS + '/api/subscribe/' + process.env.MAILTRAIN_LIST_ID + '?access_token=' + process.env.MAILTRAIN_ACCESS_TOKEN, {
                method: 'POST',
                header: 'content-type: application/x-www-form-urlencoded',
                data: {
                    email: email,
                    MERGE_CHECKBOX: "yes",
                    REQUIRE_CONFIRMATION: "no"
                }
            })
            .then(res => console.log(res.data))

        }

        var rateLimit = new RateLimit(1, 3000, true)

        async function extractEmails(body) {
            const extractEmails = require('extract-emails');

            var emails = await extractEmails(body);

            emails.forEach(async function(email, i) {
                if (!extractedEmailsArray.includes(email) && domainIsValid(email) && syntaxIsValid(email) && isCustomSyntaxValid(email)) {
                    await extractedEmailsArray.push(email);

                    if (email.length > 1){
                        if (process.env.RATE_LIMIT === 'true'){
                            rateLimit.schedule(async () => {
                                await sendToEmailList(email)
                            })
                        }else{
                            await sendToEmailList(email)
                        }

                    }

                    // await sleep(5000)

                    if (extractedEmailsString === "") {
                        extractedEmailsString = extractedEmailsString + email;
                    } else {
                        extractedEmailsString = extractedEmailsString + "\n"+ email;
                    }
                }

                if (i == emails.length-1 && extractedEmailsString.length > 0) {
                    if (process.env.SAVE_TO_FILE === 'true'){
                       await saveToFile(extractedEmailsString);
                    }
                }
            });

            callback(url);
        }
    }

    function saveToFile(data) {
        var fs = require('fs');
        fs.appendFileSync(Config.settings().listFolder + fileName, "\n"+data);
    }

    function domainIsValid(email) {
        var b = false;
    
        domainsToSave.forEach(function(domain) {
            if (domain === email.slice(email.indexOf("@"), email.length)) {
                b = true;
            }
        });

        return b;
    }

    function syntaxIsValid(email) {
        var re = /^((?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\]))$/;
        return re.test(String(email).toLowerCase());
    }

    function isCustomSyntaxValid(email) {
        var b = true;

        if (email.slice(0, email.indexOf("@")).length > Config.settings().max_character_local_part) {
            b = false;
        }

        if (!Config.settings().saveEmailsWithNumberOnlyLocalPart) {
            function isInt(n) {
                return n % 1 === 0;
            }

            if (isInt(email.slice(0, email.indexOf("@")))) {
                b = false;
            }
        } 

        if (email.slice(0, email.indexOf("@")).length < Config.settings().min_character_local_part) {
            b = false;
        }

        return b;
    }
}