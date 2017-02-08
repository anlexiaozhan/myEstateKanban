
var request = require('request');
//server-jQuery
var cheerio = require('cheerio');
//转码
var iconv = require('iconv-lite');
var asyncModule = require('async')
var cityModel = require('./cityModel.js')

/**处理Request过程，主要是转码 */
function processRequest(option, callback) {
    request(option, function (error, response, body) {
        if (error) {
            console.log(error)
        } else {
            var result = cbResponse(response, body);
            callback(result)
        }
    })
}
/**转码 */
var cbResponse = function (response, body) {
    var contentType = response.headers['content-type'];
    var reg = /charset=([\w-]+)/;
    var encoding = contentType.match(reg) ? contentType.match(reg)[1] : '';
    var data = '';
    if (encoding.length) {
        data = iconv.decode(body, encoding)
    } else {
        //如响应头没有编码，尝试转换
        var tryData = iconv.decode(body, 'utf8');
        encoding = tryData.match(reg) ? tryData.match(reg)[1] : 'utf8';
        if (encoding !== 'utf8') {
            //如支持此编码
            if (iconv.encodingExists(encoding))
                data = iconv.decode(body, encoding)
        }
    }
    return {
        body: body,
        encoding: encoding,
        data: data
    }
}

/**获取最新成交信息 
 * mainObj 主体信息，可以挂载其他对象在主体信息
*/
function getZxcj(mainObj) {
    var uri = 'http://gs.czfdc.com.cn/newxgs/Pages/Code/Xjfas.ashx'
    var option = {
        uri: uri,
        method: 'post',
        formData: {
            method: "GetIndexMrxsdt"
        },
        //不需要转码
        encoding: null
    };
    processRequest(option, function (res) {
        var resJson = JSON.parse(res.data);
        //挂载到主体对象
        mainObj['GetIndexMrxsdt'] = resJson;
        //console.log(mainObj)
        cityModel.create({
            type: 'Zxcj',
            infoDate: mainObj.infoDate,
            originUri: uri,
            originData: JSON.stringify(mainObj),
            parseData: mainObj
        }, function (err, doc) {
            console.log(err);
        })
    })
}

/**获取最新开盘 */
function getZxkp() {
    var uri = 'http://cz.fang.com/'
    var option = {
        uri: uri,
        method: 'get',
        encoding: null
    }
    processRequest(option, function (res) {
        var $ = cheerio.load(res.data);
        var $html = $('#dsy_D04_42 .infbox')
        var ary = []
        $html.each(function (i, e) {
            var date = $(e).find('span').text()
            var tempAry = []
            var p = $(e).find('p')
            p.each(function (pindex, pelement) {
                var temp = {}
                var price = $(pelement).find('em').text().trim();
                var href = $(pelement).find('a').attr('href');
                var name = $(pelement).find('a').text();
                temp['price'] = price;
                temp['href'] = href;
                temp['name'] = name;
                tempAry.push(temp);
            })
            ary.push({ date: date, content: tempAry })
        })
        cityModel.create({
            type: 'Zxkp',
            infoDate: new Date(),
            originUri: uri,
            originData: $html,
            parseData: ary
        }, function (err, doc) {
            console.log(err);
        })/**/
    })
}

/**匹配多个正则后输出对象
 * orgin：原始数据
 * obj:赋值对象
 * regs:正则数组
 * keys:赋值key数组
 */
function matchMultiReg(origin, obj, regs, keys) {
    regs.forEach(function (reg, i) {
        var val = null;
        var match = origin.match(reg);
        if (match) {
            val = match[1]
            obj[keys[i]] = val
        }
    })
    return obj;
}
/**历史数据 */
function getHistory(uriList) {
    var regs = [
        /发布日期：(\d+-\d+-\d+)/,
        /(\d+月\d+日至\d+月\d+日|\d+年\d+月\d+日至\d+年\d+月\d+日)/m,
        /全市商品房销售备案面积为(\d+(?:\.\d+)?)/m,
        /商品住宅销售备案面积(\d+(?:\.\d+)?).*/m,
        /市区商品房销售备案面积为(\d+(?:\.\d+)?)/m,
        /(?=市区商品房销售备案面积).*商品住宅销售备案面积(\d+(?:\.\d+)?).*/m,
        ///.*商品住宅销售备案面积(\d+(?:\.\d+)?).*/m,
        //火狐上，上述正则可以使用，Node中结果不对，所以改用 正向前瞻（断言），参考 http://www.cnblogs.com/rubylouvre/archive/2010/03/09/1681222.$html
        /全市商品房销售均价为(\d+(?:\.\d+)?)/m,
        /商品住宅销售均价为(\d+(?:\.\d+)?).*/m,
        /市区商品房销售均价为(\d+(?:\.\d+)?)/m,
        /(?=市区商品房销售均价).*商品住宅销售均价为(\d+(?:\.\d+)?).*/m,
        ///.*商品住宅销售均价为(\d+(?:\.\d+)?).*/m,
        /全市商品房批准预售面积为(\d+(?:\.\d+)?)/m,
        /商品住宅累计批准预售面积为(\d+(?:\.\d+)?).*/m,
        /市区商品房批准预售面积为(\d+(?:\.\d+)?)/m,
        /(?=市区商品房批准预售面积).*商品住宅累计批准预售面积(\d+(?:\.\d+)?).*/m
        ///.*商品住宅累计批准预售面积(\d+(?:\.\d+)?).*/m
    ]
    var keys = [
        'publishDate',//发表日期
        'dataPeriod',//数据周期
        'qsspfbamj', //全市商品房销售备案面积
        'qsspzzbamj', //全市商品住宅销售备案面积
        'sqspfbamj', //市区商品房销售备案面积
        'sqspzzbamj', //市区商品住宅销售备案面积
        'qsspfprice', //全市商品房销售均价
        'qsspzzprice', // 全市商品住宅销售均价
        'sqspfprice', // 市区商品房销售均价
        'sqspzzprice', // 市区商品住宅销售均价
        'qsspfysmj', // 全市商品房批准预售面积
        'qsspzzysmj', // 全市商品住宅批准预售面积
        'sqspfysmj', // 市区商品房批准预售面积
        'sqspzzysmj' // 市区商品住宅批准预售面积
    ]

    var prefix = 'http://fgj.changzhou.gov.cn'
    uriList.forEach(function (e, i) {
        //var uri='http://fgj.changzhou.gov.cn/$html/fgj/2017/CMKLIAFM_0203/12488.$html'
        var uri = prefix + e;
        var option = {
            uri: uri,
            method: 'get',
            encoding: null
        }
        processRequest(option, function (res) {
            var obj = {};
            matchMultiReg(res.data, obj, regs, keys);
            //转换日期
            obj.publishDate = new Date(obj.publishDate);
            cityModel.find({ type: 'History', originUri: uri }, function (err, docs) {
                if (err) {
                }
                else {
                    if (!docs || docs.length == 0) {
                        cityModel.create({
                            type: 'History',
                            infoDate: obj.publishDate,
                            originUri: uri,
                            originData: res.data,
                            parseData: obj
                        }, function (err, doc) {
                            console.log(err);
                        }
                        )
                    }
                }
            })
        })
    })
    console.log('--getHistory--ok--')
}
/**土拍 */
function getTupai() {
    var uri = 'http://112.21.191.81:81/view/index?regionCode=&resourceStatus=10&useType=&orderBy=0&title=';
    var option = {
        uri: uri,
        method: 'get',
        encoding: null
    }
    processRequest(option, function (res) {
        var $ = cheerio.load(res.data);
        var $html = $('a.link-wrap');
        $html.each(function (i, e) {
            var $e = $(e);
            if ($e.find('.label-over').length) {
                //排除已经终止的
                return false;
            }
            var link = $e.attr('href');
            var title = $e.find('.pic-title').text().trim();
            var price = $e.find('.price-font-small').text().replace(/[\r\n\s\t]/g, '');
            var num = $e.find('.price:nth-child(2) .value em').text().trim();
            //面积
            var area = $e.find('.price:nth-child(3) .value em').text().trim();
            //挂牌结束时间
            var time = $e.find('.time').attr('value');
            var id = $e.find('.time').attr('id');
            var obj = { id, link, title, price, num, area, time };
            cityModel.find({ type: 'Tupai', 'parseData.num': obj.num }, function (err, docs) {
                if (err) {

                } else {
                    if (!docs || docs.length == 0) {
                        cityModel.create({
                            type: 'Tupai',
                            infoDate: new Date(),
                            originUri: uri,
                            originData: $e,
                            parseData: obj
                        }, function (err, doc) {
                            console.log(err);
                        });
                    }
                }
            })
        })
    })
    console.log('--getTupai--ok--')
}

/**存量房信息 
 * TODO:数据还需进一步提取
*/
function getClfHouse() {
    var uri = 'http://58.216.221.205:8089/NewXxgs/Pages/ClfHouse/ClfHouseIndex.jsp';
    var option = {
        uri: uri,
        method: 'get',
        encoding: null
    }
    processRequest(option, function (res) {
        var $ = cheerio.load(res.data);
        var $html = $('table[height="293"] table tr');
        var match = /(\d+-\d+-\d+)/;
        var infoDate = res.data.match(match)[1]
        $html.each(function (i, e) {
            var $e = $(e);
        })
        cityModel.create({
            type: 'ClfHouse',
            infoDate: new Date(infoDate),
            originUri: uri,
            originData: res.data,
            parseData: null
        }, function (err, doc) {
            console.log(err);
        });
    })
}
  
/*****执行区域 */

module.exports.runTask = function () {
    console.log(new Date()+ '--runTask start--');
  
    //最新成交
    asyncModule.series([function (completeCb) {
        var uri = 'http://gs.czfdc.com.cn/newxgs/Pages/Code/Xjfas.ashx'
        var option = {
            uri: uri,
            method: 'post',
            formData: {
                method: "GetIndexGxData"
            },
            //不需要转码
            encoding: null
        };
        processRequest(option, function (res) {
            var resJson = JSON.parse(res.data);
            var mainObj = {}
            //返回月份从1开始，所以减1
            mainObj.infoDate = new Date(resJson[0].theyear, resJson[0].themonth - 1, resJson[0].theday)
            //挂载到主体对象
            mainObj['GetIndexGxData'] = resJson
            completeCb(null, mainObj)
        })
    }], function (err, result) {
        if (err) {
            console.log(err);
        } else {
            //注意，结果是数组
            getZxcj(result[0]);
        }
    })
    //历史数据
    asyncModule.series([function (completeCb) {
        //获取历史数据列表
        var uri = 'http://fgj.changzhou.gov.cn/class/CMKLIAFM/'
        var option = {
            uri: uri,
            method: 'get',
            //不需要转码
            encoding: null
        };
        processRequest(option, function (res) {
            var $ = cheerio.load(res.data);
            var $html = $('table.border2 a');
            var ary = [];
            var reg = /CMKLIAFM/;
            $html.each(function (i, e) {
                var $e = $(e)
                var href = $e.attr('href');
                if (reg.test(href))
                    ary.push(href);
            })
            completeCb(null, ary)
        })
    }], function (err, result) {
        if (err) {
            console.log(err);
        } else {
            //注意，结果是数组
            getHistory(result[0]);
        }
    })
    getZxkp();
    getTupai();
    getClfHouse();
}