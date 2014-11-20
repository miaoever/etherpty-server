var express = require('express');
var config = require('../config/config.json');

var app = express();
app.set ('views', __dirname + '/views');
app.set ('view engine', 'ejs');
app.use('/js', express.static(__dirname + '/public'));

app.get('/:token', function(req, res){
  var proto = config.server.protocol;
  var host = config.server.host;
  var port = config.server.port;
  var url = proto + "://" + host + ":" + port;

  res.render('index.ejs',{"token":req.params.token, "url":url});
});

app.listen(config.web.port);
