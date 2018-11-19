var express = require('express');
var router = require('./routes');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var uuid = require('uuid');
var session = require('express-session');
var database = require('mysql');
var flash = require('connect-flash');
var app = express();

app.set('view engine', 'jade');
app.use(flash());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session( {
    genid: function(req) {
        return uuid.v1();
    },
    secret: 'surveyHq',
    cookie:
        {
            secure: false
        },
    resave: false,
    saveUninitialized: false
}));

app.use('/', router);

app.use(express.static('public'));

app.get('/', function (req, res) {
   res.sendFile( __dirname + "/routes" + "/index.jade" );
});

var models = require('./models');

app.set('port', process.env.PORT || 5000);

models.sequelize.sync().then(function () {
  var server = app.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + server.address().port);
  });
});
