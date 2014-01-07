var config = require('./config.js');
var smileys = require('./smiley.js');
var Twit = require('twit');
var io = require('socket.io');
var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');

// Express
var app = express();
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', routes.index);

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

// Socket.io
var sockets = io.listen(server, { log: false });

// Twitter
var twitter = new Twit({
    consumer_key: config.CONSUMER_KEY
  , consumer_secret: config.CONSUMER_SECRET
  , access_token: config.ACCESS_TOKEN
  , access_token_secret: config.ACCESS_TOKEN_SECRET
});

var keys = [];
for(var smiley in smileys) keys.push(smiley);

var stream = twitter.stream('statuses/filter', { track: keys });

sockets.sockets.on('connection', function(socket){
  stream.on('tweet', function (tweet) {
    if (tweet.text != null && tweet.place != null && tweet.place.country_code != null) {
      var tokens = tweet.text.split(" ");
      var sentiment = 0;
      tokens.forEach(function(token) {
        for ( var smiley in smileys ) {
          if (smiley == token) {
            sentiment = smileys[smiley];
            break;
          }
        }
      });
      socket.emit("tweet", JSON.stringify({ code: tweet.place.country_code, sentiment: sentiment }) );  
    }
  });
});

