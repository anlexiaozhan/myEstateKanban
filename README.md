
#商品房销售信息看板

以常州市的商品房销售数据为参考，抓取 [最新成交](http://gs.czfdc.com.cn/newxgs/index.aspx)，[历史数据](http://fgj.changzhou.gov.cn/class/CMKLIAFM)，
[最新开盘](http://cz.fang.com/)，[土拍信息](http://112.21.191.133:81/) 等材料作为前端显示素材。

- 使用cron和child process 设置定时任务（当前默认为：每天12-23点，33分启动任务。见 bin\www下配置。）
- 自动运行入口为：task/runTask，手动运行入口：task/mainTask
- 使用mongodb作为数据库（数据库中字段originData保存原始数据，字段parseData保存解析后数据）。
- 采用cheerio作用服务器端html解析。
- iconv-lite对request请求数据解码。
- 前端使用fullpage进行整屏切换，bootstrap响应式设计。

> Written with [StackEdit](https://stackedit.io/).
