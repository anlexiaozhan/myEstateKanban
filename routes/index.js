var express = require('express');
var router = express.Router();
var cityModel = require('../task/cityModel.js')

var asyncModule=require('async');
var moment=require('moment')
const NodeCache = require( "node-cache" );
//缓存150s
const myCache = new NodeCache( { stdTTL: 150, checkperiod: 180 } );

function leftZeroPad(val, minLength) {
    if (typeof(val) != "string")
        val = String(val);
    return ('000000000000000000'.substring(0, minLength - val.length)) + val;
}


/* GET home page. */
router.get('/', function(req, res, next) {
  //get from cache
  myCache.get('results',function(err, value){
    if( !err ){
      var results=null;
      if(value == undefined){
        // key not found
        setCache(function(){
          //setCache 内部有parallel，所以确保执行完成后再进行render
          results = myCache.get( "results");
          render(res,results);
        });
      }else{
        console.log( '---cache---' );
        results=value;
        render(res,results);       
      }      
    }    
  })
  /**获取数据并存入cache */
  function setCache(cb){
    console.log( '--setCache--' );
    asyncModule.parallel([
      function(cbComplete){
        cityModel.find({type:'Zxcj'},
          {parseData:1,infoDate:1,createTime:1 },
          {sort:{createTime:-1}, limit:1},function(err,docs){
            if(docs){
              cbComplete(null,docs[0]);
            }
          })     
      },
      function(cbComplete){
        cityModel.find({type:'History'},
          {parseData:1,infoDate:1 },
          {sort:{infoDate:-1, createTime:-1}, limit:10},function(err,docs){
            if(docs){
              var histories={};
              histories.dataPeriod=[];
              histories.sqspzzysmj=[];
              histories.sqspzzbamj=[];
              histories.sqspzzprice=[];
              docs.forEach(function(e,i){
                var item=e['parseData'];
                histories.dataPeriod.unshift(item.dataPeriod),
                histories.sqspzzysmj.unshift(item.sqspzzysmj),
                histories.sqspzzbamj.unshift(item.sqspzzbamj),
                histories.sqspzzprice.unshift(item.sqspzzprice)
              })
              //为了方便图显示，处理周期数据
              //2017年1月3日 --> 1/3 ,1月3日 --> 1/3
              histories.dataPeriod=histories.dataPeriod.map(
                function(val,i){
                  return val.replace(/(\d+年)|日/g,'').replace(/月/g,'/');
              })
              cbComplete(null,histories);
            }
          });
      },
      function(cbComplete){
        cityModel.find({type:'Zxkp'},
          {parseData:1,infoDate:1 },
          {sort:{createTime:-1}, limit:1},function(err,docs){
            if(docs){
              var mon=new Date().getMonth()+1;
              mon=leftZeroPad(mon,2);
              var zxkps=docs[0]['parseData'];
              zxkps=zxkps.filter(function(val,i,ary){
                var curMon=val['date'].split('/')[0];
                //只需要当月的开盘数据
                return curMon ==mon;
              })
              cbComplete(null,zxkps);
            }
          })
      },
      function(cbComplete){
        cityModel.find({type:'Tupai'},
          {parseData:1,infoDate:1 },
          {sort:{infoDate:-1, createTime:-1}, limit:6},function(err,docs){
            if(docs){
              
              var tupais=[]
              docs.forEach(function(e,i){
                tupais.push(e['parseData']);
              })
              cbComplete(null,tupais);
            }
          });
      }        
    ],function(err,results){
      myCache.set('results',results);
      cb();
    }) 
  }
  function render(res,results){
    res.render('index', { title: '常州市商品房销售信息看板' ,
    zxcjs:results[0]['parseData']['GetIndexMrxsdt'],histories:results[1], 
    zxkps:results[2],tupais:results[3],
    //成交日期
    cjInfoDate:moment(results[0]['infoDate']).format('YYYY-M-D'),
    //更新时间
    createTime:moment(results[0]['createTime']).format('HH:mm'),
    //成交总套数
    cjRoomnums:results[0]['parseData']['GetIndexGxData'][0]['roomnums']
    });
  }    
});

router.get('/test',function(req,res,next){
  res.render('test')
})

module.exports = router;
