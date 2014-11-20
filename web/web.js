var express = require('express');
var app = express();
app.set ('views', __dirname + '/views');
app.set ('view engine', 'ejs');
app.use('/js', express.static(__dirname + '/public'));
  //app.use(express.cookieParser('etherpty-secret-81119891'));
  //app.use(express.session());
var cookieParser = require('cookie-parser')
app.use(cookieParser())

app.get('/:token', function(req, res){
  res.render('index.ejs',{"token":req.params.token})
});

app.listen(8082);
