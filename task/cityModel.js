var mongoose = require('mongoose')
var citySchema = new mongoose.Schema({
    city: { type: String, default: 'CHN320400' },
    type: String,
    //数据日期
    infoDate: Date,
    //采集时间
    createTime: { type: Date, default: Date.now },
    originUri: String,
    originData: String,
    parseData: Object
})

var cityModel = mongoose.model("cityestateinfo", citySchema);

module.exports=cityModel