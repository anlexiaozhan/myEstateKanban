var mongoose = require('mongoose');
var mongodb_url = 'mongodb://localhost:27017/myEstateKanban';
mongoose.connect(mongodb_url);

var task=require('./mainTask')
task.runTask();