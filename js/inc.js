/* ***** html5sql.js ******
 *
 * Description: A helper javascript module for creating and working with
 *     HTML5 Web Databases.
 *
 * License: MIT license <http://www.opensource.org/licenses/mit-license.php>
 *
 * Authors: Ken Corbett Jr
 *
 * Version 0.9.1
 *
 * General Module Design based on article by Ben Cherry
 * http://www.adequatelygood.com/2010/3/JavaScript-Module-Pattern-In-Depth
 * 
 */

var html5sql = (function () {
    
    var readTransactionAvailable = false,
        doNothing = function () {},
        emptyArray = [],
        trim = function (string) {
            return string.replace(/^\s+/, "").replace(/\s+$/, "");
        },
        isArray = function (o) {
            return Object.prototype.toString.call(o) === '[object Array]'; 
        },
        // transaction is an sql transaction, sqlObjects are properly formated
        // and cleaned SQL objects
        sqlProcessor = function (transaction, sqlObjects, finalSuccess, failure) {
            
            var sequenceNumber = 0,
                dataForNextTransaction = null,
                runTransaction = function () {
                    transaction.executeSql(sqlObjects[sequenceNumber].sql,
                                           sqlObjects[sequenceNumber].data,
                                           successCallback,
                                           failureCallback);
                },
                successCallback = function (transaction, results) {
                    if(html5sql.logInfo){
                        console.log("Success processing: " + sqlObjects[sequenceNumber].sql);
                    }
                    
                    //Call the success callback provided with sql object
                    //If an array of data is returned use that data as the
                    //data attribute of the next transaction
                    dataForNextTransaction = sqlObjects[sequenceNumber].success(transaction, results);
                    sequenceNumber++;
                    if (dataForNextTransaction && $.isArray(dataForNextTransaction)) {
                        sqlObjects[sequenceNumber].data = dataForNextTransaction;
                        dataForNextTransaction = null;
                    } else {
                        dataForNextTransaction = null;
                    }
                    
                    if (sqlObjects.length > sequenceNumber) {
                        runTransaction();
                    } else {
                        finalSuccess();
                    }
                },
                failureCallback = function (transaction, error) {
                    if(html5sql.logErrors){
                        console.error("Error: " + error.message + " while processing: " + sqlObjects[sequenceNumber].sql);
                    }
                    failure(error, sqlObjects[sequenceNumber].sql);
                };
            
            runTransaction();
        },
        sqlObjectCreator = function (sqlInput) {
            var i;
            if (typeof sqlInput === "string") {
                trim(sqlInput);
                
                //Separate sql statements by their ending semicolon
                sqlInput = sqlInput.split(';');
                
                for(i = 1; i < sqlInput.length; i++){
                    //Ensure semicolons within quotes are replaced
                    while(sqlInput[i].split(/["]/gm).length % 2 === 0 ||
                          sqlInput[i].split(/[']/gm).length % 2 === 0 ||
                          sqlInput[i].split(/[`]/gm).length % 2 === 0){
                         sqlInput.splice(i,2,sqlInput[i] + ";" + sqlInput[i+1]);
                    }
                    //Add back the semicolon at the end of the line
                    sqlInput[i] = trim(sqlInput[i]) + ';';
                    //Get rid of any empty statements
                    if(sqlInput[i] === ';'){
                        sqlInput.splice(i, 1);
                    }
                }
            }
            for (i = 0; i < sqlInput.length; i++) {
                //If the array item is only a string format it into an sql object
                if (typeof sqlInput[i] === "string") {
                    sqlInput[i] = {
                        "sql": sqlInput[i],
                        "data": [],
                        "success": doNothing
                    };
                } else {
                    // Check to see that the sql object is formated correctly.
                    if (typeof sqlInput[i]         !== "object"   ||
                        typeof sqlInput[i].sql     !== "string"   ||
                        typeof sqlInput[i].success !== "function" ||
                        !$.isArray(sqlInput[i].data)) {
                        throw new Error("Malformed sql object");
                    }
                }
            }
            return sqlInput;
        },
        statementsAreSelectOnly = function (SQLObjects) {
        // Returns true if all SQL statement objects are SELECT statements.
            var i = 0,
                SelectStmtMatch = new RegExp('^select\\s', 'i'),
                isSelectStmt = function (sqlstring) {
                    return SelectStmtMatch.test(sqlstring);
                };
                
            //Loop over SQL objects ensuring they are select statments
            do {
                //If the sql string is not a select statement return false
                if (!isSelectStmt(SQLObjects[i].sql)) {
                    return false;
                }
                i++;
            } while (i < SQLObjects.length);
        
            //If all the statments happen to be select statments return true
            return true;
        };
    return {
        database: null,
        logInfo: false,
        logErrors: false,
        openDatabase: function (name, displayname, size, whenOpen) {
            html5sql.database = openDatabase(name, "", displayname, size);
            readTransactionAvailable = typeof html5sql.database.readTransaction === 'function';
            if (whenOpen) {
                whenOpen();
            }
        },
        
        process: function (sqlInput, finalCallback, errorCallback) {

            if (html5sql.database) {
                
                var sqlObjects = sqlObjectCreator(sqlInput);
                
                if (statementsAreSelectOnly(sqlObjects) && readTransactionAvailable) {
                    html5sql.database.readTransaction(function (transaction) {
                        sqlProcessor(transaction, sqlObjects, finalCallback, errorCallback);
                    });
                } else {
                    html5sql.database.transaction(function (transaction) {
                        sqlProcessor(transaction, sqlObjects, finalCallback, errorCallback);
                    });
                }
            } else {
                // Database hasn't been opened.
                if(html5sql.logErrors){
                    console.error("Error: Database needs to be opened before sql can be processed.");
                }
                return false;
            }
        },
    
        changeVersion: function (oldVersion, newVersion, sqlInput, finalCallback, errorCallback) {

            if (html5sql.database) {
                if(html5sql.database.version === oldVersion){
                    var sqlObjects = sqlObjectCreator(sqlInput);
                
                    html5sql.database.changeVersion(oldVersion, newVersion, function (transaction) {
                        sqlProcessor(transaction, sqlObjects, finalCallback, errorCallback);
                    });
                }
            } else {
                // Database hasn't been opened.
                if(html5sql.logErrors){
                    console.log("Error: Database needs to be opened before sql can be processed."); 
                }
                return false;
            }
        
        }
    };
})();

/*
var dt = new Date(2009, 9, 13, 7, 20); // 注意第二个参数月的范围是 [0, 11]
var ld = new LunarDate(dt);
document.write(ld.lYear + "（" + ld.aYear + "）年" + ld.lMonth + "月" + ld.lDay + ld.lHour + "时");

//对象成员变量说明：
//aYear 生肖
//lYear 天干地支
//lMonth 农历月
//lDay 农历日
//lHour 农历时
*/


function LunarDate(dt) {
    this.dt = dt;

    this.y = null;
    this.m = null;
    this.d = null;
    this.h = null;

    this.aYear = ""; // 生肖
    this.lYear = ""; // 天干地支
    this.lMonth = ""; // 农历月
    this.lDay = ""; // 农历日
    this.lHour = ""; // 农历时
    
    this.heavenlyStems = "甲乙丙丁戊己庚辛壬癸"; // 天干
    this.earthlyBranchs = "子丑寅卯辰巳午未申酉戌亥"; // 地支
    this.animalYears = "鼠牛虎兔龙蛇马羊猴鸡狗猪"; //生肖
    this.moonMonths = "正二三四五六七八九十冬腊";
    this.days = "日一二三四五六";
    this.chineseNumbers = "一二三四五六七八九十";
    this.cData = new Array(20);
    this.madd = new Array(12);

    this.ini = function() {
        this.cData[0] = 0x41A95;
        this.cData[1] = 0xD4A;
        this.cData[2] = 0xDA5;
        this.cData[3] = 0x20B55;
        this.cData[4] = 0x56A;
        this.cData[5] = 0x7155B;
        this.cData[6] = 0x25D;
        this.cData[7] = 0x92D;
        this.cData[8] = 0x5192B;
        this.cData[9] = 0xA95;
        this.cData[10] = 0xB4A;
        this.cData[11] = 0x416AA;
        this.cData[12] = 0xAD5;
        this.cData[13] = 0x90AB5;
        this.cData[14] = 0x4BA;
        this.cData[15] = 0xA5B;
        this.cData[16] = 0x60A57;
        this.cData[17] = 0x52B;
        this.cData[18] = 0xA93;
        this.cData[19] = 0x40E95;
        this.madd[0] = 0;
        this.madd[1] = 31;
        this.madd[2] = 59;
        this.madd[3] = 90;
        this.madd[4] = 120;
        this.madd[5] = 151;
        this.madd[6] = 181;
        this.madd[7] = 212;
        this.madd[8] = 243;
        this.madd[9] = 273;
        this.madd[10] = 304;
        this.madd[11] = 334;
    }
    this.ini();


    function getBit(m, n) {
        return (m >> n) & 1;
    }


    this.e2c = function() {
        var total, m, n, k;
        var isEnd = false;
        var tmp = this.dt.getFullYear();
        if (tmp < 1900) tmp += 1900;
        total = (tmp - 2001) * 365
+ Math.floor((tmp - 2001) / 4)
+ this.madd[this.dt.getMonth()]
+ this.dt.getDate()
- 23;
        if (this.dt.getFullYear() % 4 == 0 && this.dt.getMonth() > 1)
            total++;
        for (m = 0; ; m++) {
            k = (this.cData[m] < 0xfff) ? 11 : 12;
            for (n = k; n >= 0; n--) {
                if (total <= 29 + getBit(this.cData[m], n)) {
                    isEnd = true;
                    break;
                }
                total = total - 29 - getBit(this.cData[m], n);
            }
            if (isEnd) break;
        }
        this.y = this.dt.getFullYear();
        if (this.y >= 2001) {
            this.y = 2001 + m;
        }
        this.m = k - n + 1;
        this.d = total;
        if (k == 12) {
            if (this.m == Math.floor(this.cData[m] / 0x10000) + 1)
                this.m = 1 - this.m;
            if (this.m > Math.floor(this.cData[m] / 0x10000) + 1)
                this.m--;
        }
        this.h = Math.floor((this.dt.getHours() + 3) / 2);
    }


    this.convert = function() {
	    this.aYearId = (this.y - 4) % 12 + 1;
        this.aYear = this.animalYears.charAt((this.y - 4) % 12);

        this.lYear = this.heavenlyStems.charAt((this.y - 4) % 10) + this.earthlyBranchs.charAt((this.y - 4) % 12);

        if (this.m < 1) {
            this.lMonth = "闰" + this.moonMonths.charAt(-this.m - 1);
        }
        else {
            this.lMonth = this.moonMonths.charAt(this.m - 1);
        }

        this.lDay = (this.d < 11) ? "初" : ((this.d < 20) ? "十" : ((this.d < 30) ? "廿" : "卅"));
        if (this.d % 10 != 0 || this.d == 10) {
            this.lDay += this.chineseNumbers.charAt((this.d - 1) % 10);
        }
        if (this.lDay == "廿") {
            this.lDay = "二十";
        }
        else if (this.lDay == "卅") {
            this.lDay = "三十";
        }

        this.lHour = this.earthlyBranchs.charAt((this.h - 1) % 12);
    }

    this.e2c();
    this.convert();
}

LunarDate.prototype.aYear = ""; // 生肖
LunarDate.prototype.aYearId = ""; // 生肖id
LunarDate.prototype.lYear = ""; // 天干地支
LunarDate.prototype.lMonth = ""; // 农历月
LunarDate.prototype.lDay = ""; // 农历日
LunarDate.prototype.lHour = ""; // 农历时

//取生肖, 参数必须是四位的年 
function getshengxiao(yyyy){ 
    //var arr=['猴','鸡','狗','猪','鼠','牛','虎','兔','龙','蛇','马','羊'];
    var arr=['9','10','11','12','1','2','3','4','5','6','7','8'];
    return /^\d{4}$/.test(yyyy) ? arr[yyyy%12] : null;
} 

//自定义alert
function _alert (message, alertCallback, title, buttonName) {
    var callback = alertCallback || function(){}, t = title || "", b = buttonName || "";
    if(debug){
        alert(message);
    }else{
        navigator.notification.alert(message, callback, t, b);
    }
}

//自定义confirm
function _confirm (message, alertCallback, title, buttonName) {
    var callback = alertCallback || function(){}, t = title || "", b = buttonName || "";
    if(debug){
        var v = confirm(message);
        v = (v) ? 1 : 2;
        callback(v);
    }else{
        navigator.notification.confirm(message, callback, t, b);
    }
}

//取1-12的随机数
function rander () {
    return Math.floor(Math.random()*12+1);
}

//获取yyyymmdd日期格式
function getMonthDate () {
    var dt = new Date();
    var y = dt.getFullYear();
    var m = dt.getMonth()+1;
    var d = dt.getDate();
    m = (m < 10) ? "0" + m : m;
    d = (d < 10) ? "0" + d : d;
    return y+""+m+""+d;
}