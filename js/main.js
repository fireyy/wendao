var UPDATE_URL = "http://m.wolftankk.com:8080/upgrade", USERID = 0, CID = 0, EDIT = 0, USERLIST = 0, LIMIT_NUM = 200, BIRDAY = new Date(1990, 4, 10, 7, 20), EVENTER = (debug) ? "click" : "vmousedown";

var preventBehavior = function (e) {
    e.preventDefault();
};

//检测用户的网络链接情况
function checkConnection () {

    if(debug) return true;

    var networkState = navigator.network.connection.type;
    var states = {};
    states[Connection.UNKNOWN]  = 'Unknown connection';
    states[Connection.ETHERNET] = 'Ethernet connection';
    states[Connection.WIFI]     = 'WiFi connection';
    states[Connection.CELL_2G]  = 'Cell 2G connection';
    states[Connection.CELL_3G]  = 'Cell 3G connection';
    states[Connection.CELL_4G]  = 'Cell 4G connection';
    states[Connection.NONE]     = 'No network connection';

    //alert('Connection type: ' + states[networkState]);

    if(networkState == Connection.NONE){
        return false;
    }else{
        return true;
    }
}

//检测是否本地数据库是否已经存在，不存在则创建
function chkExistTable () {
    if(DBver != window.localStorage.getItem("DBver")){
        initDataBase();
        return ;
    }
    html5sql.process(
        [
            {
                sql: "SELECT max(updatetime) as updatetime FROM hauldata;",
                data: [],
                success: function(tx, data){
                    window.localStorage.setItem("lastid", data.rows.item(0).updatetime);
                }
            }
        ],
        function(){
            if(checkConnection()) {
                updateLocalData();
            }else{
	            initLocalUser();
            }
        },
        function(error, failingQuery){ //Failure
            initDataBase();
            //_alert("Error: " + error.message);
        }
    );
}

//创建本地数据库和表，导入初始化数据
function initDataBase () {
    $.get("datas/data.sql",function(sql){
        html5sql.process(
            sql,
            function(){ //Success
	            window.localStorage.setItem("DBver",DBver);
                chkExistTable();
            },
            function(error, failingQuery){ //Failure
                _alert("Error: " + error.message);
            }
        );
    });
}

function initUserDB () {
	$.get("datas/user.sql",function(sql){
        html5sql.process(
            sql,
            function(){ //Success
                checkUserList();
            },
            function(error, failingQuery){ //Failure
                _alert("Error: " + error.message);
            }
        );
    });
}

//检查是否有数据更新，如果有则更新本地数据库
function updateLocalData () {
    var lastid = window.localStorage.getItem("lastid");
	var num = 0,startNum = 0,limitNum = LIMIT_NUM;
	var execThree = function(){
		$.ajax({
			url: UPDATE_URL,
			data: "lastupdate="+lastid+"&start="+startNum+"&limit="+limitNum,
			dataType: 'json',
			xhrFields: {
				withCredentials: true
			},
			timeout: 10000,
			error: function(){
				if (num < 3)
				{
					num++;
					execThree();
				}else{
					initLocalUser();
				}
			},
			success: function(data){		
				if("totalCount" in data){
					if (startNum == 0)
					{
						deleteDatas();
					}
					var ht = [];
					for (var i=0;i<data.Data.length ; i++ )
					{
						ht.push("INSERT INTO `hauldata` (`id`, `catid`, `borntag`, `day`, `randomId`, `title`, `brief`, `content`, `updatetime`, `enable`) VALUES (",data.Data[i].id,",",data.Data[i].catid,", ",data.Data[i].borntag,", ",data.Data[i].day,", ",data.Data[i].randomId,", '",data.Data[i].title,"', '",data.Data[i].brief,"', '",data.Data[i].content,"', ",data.Data[i].updatetime,", ",data.Data[i].enable,");");
					}
					html5sql.process(
						ht.join(""),
						function(){ //Success
							initLocalUser();
							startNum += limitNum;
							execThree();
						},
						function(error, failingQuery){ //Failure
							_alert("Error: " + error.message);
						}
					);						
				}else{
					initLocalUser();
				}
			}
		});
	}
	//execThree();
    initLocalUser();
}


function deleteDatas () {
    html5sql.process(
        "DELETE FROM hauldata;",
        function(){ //Success
			//_alert("Error: " + error.message);
        },
        function(error, failingQuery){ //Failure
            _alert("Error: " + error.message);
        }
    );
}

function getBorn (id) {
	var arr = ["鼠","牛","虎","兔","龙","蛇","马","羊","猴","鸡","狗","猪"];
	return arr[(id-1)];
}

function initLocalUser () {
	checkUserList();
}

function hideSplash () {
	$("#profile_list").listview('refresh');
	if(!debug){
		navigator.splashscreen.hide();
	}
	//$.mobile.changePage( $("#userlist"), { transition: "none", changeHash: false } );
}

function checkUserList () {
	
    html5sql.process(
        [
            {
                sql: "SELECT * FROM user;",
                data: [],
                success: function(tx,data){
                    var len = data.rows.length, arr = [];
                    if(len > 0){
	                    USERLIST = 1;
	                    for (var i = 0; i < len; i++) {
                            arr.push('<li id="user_'+data.rows.item(i).userId+'" rev="'+data.rows.item(i).borntag+'" uid="'+data.rows.item(i).userId+'"><a class="username"><i>'+data.rows.item(i).name+'</i><span class="ui-li-count">属相：'+getBorn(data.rows.item(i).borntag)+'</span></a><a class="delete">ddd</a></li>');
                        };
                        $("#profile_list").prepend(arr.join(""));
                        $("#profile_list .username").bind(EVENTER, selectUser);
                        $("#profile_list .delete").bind(EVENTER, deleteUser);
                        //$.mobile.changePage( $("#userlist"), { transition: "none", changeHash: false } );
                    }else{
                        //$.mobile.changePage( $("#info"), { transition: "none", changeHash: false } );
                    }
                }
            }
        ],
        function(){ //Success
	        hideSplash();
        },
        function(error, failingQuery){ //Failure
	        initUserDB();
            //_alert("Error: " + error.message);
        }
    );
}

function selectUser (e){
	preventBehavior(e);
	var sx = $(this).parents("li").attr("rev");
	var name = $(this).find("i").text();
	USERID = $(this).parents("li").attr("uid");
	$("#sxv").val(sx);
	if(EDIT == 1){
		$("#info .selected").removeClass("selected");
		$(".i"+sx).addClass("selected");
		$("#profile_value").val(name);
		$.mobile.changePage( $("#info"), { changeHash: false } );
	}else{
		$("#createNew").hide();
		USERLIST = 1;
		getLuckyData(sx);
	}
}

function deleteUser (e) {
	preventBehavior(e);
	var that = this;
	var callback = function(button){
		var uid = $(that).parents("li").attr("uid");
		if(button == 1){
			html5sql.process(
	            [
	                {
	                    "sql": "DELETE FROM user WHERE userId = ?;",
	                    data: [uid],
	                    success: function(){}
	                }
	            ],
	            function(){
	                $(that).parents("li").remove();
	            },
	            function(error, failingQuery){ //Failure
	                _alert("Error: " + error.message);
	            }
	        );
		}
	}
	_confirm("您确定要删除此账号吗？", callback);
}

//初始化时注册必需的tap事件
function initEventHalder () {
    $(".shengxiao li:not(.i13,.i14)").bind(EVENTER,function(e){
        preventBehavior(e);
        if($(this).hasClass("selected")){
            $("#sxv").val("");
            $(this).removeClass("selected");
        }else{
            $("#sxv").val($(this).attr("rev"));
            $(".shengxiao li.selected").removeClass("selected");
            $(this).addClass("selected");
        }
    });
    $(".i13").bind(EVENTER,function(e){
        preventBehavior(e);
        var cb = function(date) {
	        BIRDAY = date;
		    var lll = new lunarDate();
			var ld = lll.ganzhi(date);
			var obj = $(".i"+(ld.aid+1));
			$("#sxv").val(obj.attr("rev"));
            $(".shengxiao li.selected").removeClass("selected");
            obj.addClass("selected");
        };
        plugins.datePicker.show({
			date: BIRDAY,
			mode: "date",
			title: "请选择您的出生日期来确定您的属相",
			allowOldDates: true
		}, cb);

    });
    $("#r2info").bind(EVENTER,returnToInfo);
    $("#r2ask").bind(EVENTER,returnToAsk);
    $("#createNew,#editUname").bind(EVENTER,function(e){
	    preventBehavior(e);
	    var val = $("#profile_value").val() || "";
	    window.plugins.Prompt.show(
	        "输入您要创建的用户名",
	        val,
	        function (userText) {
		        $("#profile_value").val(userText);
		        saveProfileName();
	        },
	        function () {},
	        "Ok",
	        "Cancel"
	    );
		//$("#overlay,.bgCont2").show();
    });
    $("#createProfile").bind(EVENTER,saveProfileName);
    $("#dataSubmit").bind(EVENTER,submitPesData);
    $("#submitAsk").bind(EVENTER,startAsk);
    $("#submitGoOnAsk").bind(EVENTER,goOnAsk);
	$("#stopSpin").bind(EVENTER,skipWait);
    $("#dataEdit").bind(EVENTER,saveEdit);
    $("#editu").bind(EVENTER,function(e){
	    preventBehavior(e);
	    EDIT = 1;
	    $(this).hide();
	    $("#oku").show();
	    $("#info").addClass("edit");
	    $("#profile_list .delete").show();
    });
    $("#oku").bind(EVENTER,function(e){
	    preventBehavior(e);
	    EDIT = 0;
	    $(this).hide();
	    $("#editu").show();
	    $("#info").removeClass("edit");
	    $("#profile_list .delete").hide();
    });
    $("#cr_new").bind(EVENTER,function(e){
	    preventBehavior(e);
	    if(EDIT == 1) return ;
	    USERLIST = 0;
	    USERID = 0;
	    $("#sxv").val("");
	    $("#profile_value").val("");
	   	$("#createNew").show();
	    $("#info .selected").removeClass("selected");
    	$.mobile.changePage( $("#info"), { changeHash: false } );
    });
    $("#r2userlist").bind(EVENTER,function(e){
	    preventBehavior(e);
	    returnToUserlist();
    });
}

//初始化运行，手机端Device Ready之后运行
function init () {
    initEventHalder();
    html5sql.openDatabase("wendao", "wendao Database", 5*1024*1024);
    chkExistTable();
}

//返回个人信息页面
function returnToInfo (e) {
    preventBehavior(e);
    if(USERLIST == 1){
	    $.mobile.changePage( $("#userlist"), { reverse : true, changeHash: false } );
    }else{
	    $.mobile.changePage( $("#info"), { reverse : true, changeHash: false } );
    }
}

//返回问询页面
function returnToAsk (e) {
    preventBehavior(e);
    $.mobile.changePage( $("#ask"), { reverse : true, changeHash: false } );
}

function returnToUserlist () {
	$.mobile.changePage( $("#userlist"), { reverse : true, changeHash: false } );
}

//跳过演算动画
function skipWait () {
    //if(waitDelay) clearTimeout(waitDelay);
    gotoResult();
}

//显示演算结果
function gotoResult () {
    $("#stopSpin").css("visibility","hidden");
    //var sz2 = document.getElementById("sz2");
    //sz2.pause();
    //sz2.currentTime = 0;
    //停止演算动画
	$("#wait .waitt s").css("webkitAnimationPlayState","paused");
	setTimeout(function(){
		$.mobile.changePage( $("#goOnask"), { transition: "none", changeHash: false } )
	},1000);
}

function saveEdit (e){
	preventBehavior(e);
	var uid = USERID;
	var old_name = $("#user_"+uid).find(".username i").text();
	var old_sx = $("#user_"+uid).attr("rev");
	var name = $("#profile_value").val();
	var sx = $("#sxv").val();
	if(old_sx != sx || old_name != name){
		html5sql.process(
	        [
	            {
	                "sql": "UPDATE user SET name = ?, borntag = ? WHERE userId = ?;",
	                data: [name,sx,uid],
	                success: function(){}
	            }
	        ],
	        function(){
		        $("#user_"+uid).find(".username i").text(name);
		        $("#user_"+uid).find(".ui-li-count").text("属相："+getBorn(sx));
		        $("#user_"+uid).attr("rev",sx);
	            returnToUserlist();
	        },
	        function(error, failingQuery){ //Failure
	            _alert("Error: " + error.message);
	        }
	    );
	}else{
		returnToUserlist()
	}
}

//隐藏ios的软键盘
function hideKeyboard () {
	document.activeElement.blur();
	$("input").blur();
}

function exitProfileDiv () {
	//hideKeyboard();
	//$("#overlay,.bgCont2").hide();
}

function saveProfileName () {
	//preventBehavior(e);
	var p = $("#profile_value").val();
	if(p != ""){
		var len = $("#profile_list").find("li").length;
		if(len > 5){
			_alert("您只能创建5个用户，请移除不需要的用户，再创建新用户");
			return ;
		}
		var id = 0;
		html5sql.process(
            [
                {
                    "sql": "SELECT * FROM user WHERE name = ?;",
                    data: [p],
                    success: function(tx,data){
	                    var len = data.rows.length;
	                    if(len > 0){
		                    id = data.rows.item(0).userId;
	                    }
                    }
                }
            ],
            function(){
                if(id != 0) {
	                _alert("用户名已经存在，请重新输入");
                }else{
					if(USERID == 0){
						createNewProfile();
					}else{
						exitProfileDiv();
					}
                }
            },
            function(error, failingQuery){ //Failure
                _alert("Error: " + error.message);
            }
        );
	}else{
		_alert("用户名输入有误，请重新输入");
	}
}

//创建新用户档案
function createNewProfile () {
	var p = $("#profile_value").val();
	var sx = $("#sxv").val();
	if(p != ""){
		html5sql.process(
            [
                {
                    "sql": "INSERT INTO user (name, borntag) VALUES (?,?);",
                    data: [p,sx],
                    success: function(){}
                },
                {
                    "sql": "SELECT * FROM user WHERE name = ?;",
                    data: [p],
                    success: function(tx,data){
	                    USERID = data.rows.item(0).userId;
                    }
                }
            ],
            function(){
                //getLuckyData(sx);
                $("#profile_list").find("li:not('.add')").remove();
                checkUserList();
                var e = window.localStorage.getItem("expiry_"+sx+"_0");
    			var c = window.localStorage.setItem("cate_"+sx+"_0"+"_"+CID);
    			window.localStorage.removeItem("expiry_"+sx+"_0");
    			window.localStorage.removeItem("cate_"+sx+"_0"+"_"+CID);
    			window.localStorage.setItem("expiry_"+sx+"_"+USERID,e);
    			window.localStorage.setItem("cate_"+sx+"_"+USERID+"_"+CID,c);
    			$("#createNew").hide();
    			exitProfileDiv();
            },
            function(error, failingQuery){ //Failure
                _alert("Error: " + error.message);
            }
        );
	}
}

function disabledBtn(id){
    $(id).attr("disabled",true).addClass("disabled");
}

function enabledBtn(id){
    $(id).attr("disabled",false).removeClass("disabled");
}

//提交个人信息
function submitPesData (e) {
    preventBehavior(e);
    disabledBtn("#dataSubmit");
    var sx = $("#sxv").val();
    var p = $("#profile_value").val();
    if(sx != ""){
	    getLuckyData(sx);

    }else{
        enabledBtn("#dataSubmit");
        _alert("请先选择您的生肖，如果不清楚，请点击问号图标。");
    }
}

function getLuckyData (sx) {
	if(tester){
        var rand = rander();
        var day = '1';
    }else{
        var day = getMonthDate();
        var rand = rander();
    }
    
    var resid = chkToUse(dayluck, day, sx), sql, data;
    if(resid) {
        sql = "SELECT * FROM hauldata WHERE id = ? LIMIT 1;";
        data = [resid];
    }else{
        sql = "SELECT * FROM hauldata WHERE borntag = ? AND day = ? AND randomId = ? AND catid = ? LIMIT 1;";
        data = [sx,day,rand,dayluck];
    }
    html5sql.process(
        [
            {
                "sql": sql,
                data: data,
                success: function(tx,data){
	                if(data.rows.length == 0){
		                _alert("没有获取到相应数据");
		                return ;
	                }
                    if(!resid) resid = data.rows.item(0).id;
                    $("#today_lucky").html(data.rows.item(0).content);
                }
            },
            {
                "sql": "SELECT * FROM category;",
                data: [],
                success: function(tx,data){
                    var len = data.rows.length, arr = [];
                    for (var i = 0; i < len; i++) {
                        if(data.rows.item(i).categoryId == 1){
                            $("#today_things").html(data.rows.item(i).name);
                            continue;
                        }
                        arr.push("<option value='",data.rows.item(i).categoryId,"'>",data.rows.item(i).name,"</option>");
                    };
                    $("#select-choice-1").html(arr.join(""));
                }
            }
        ],
        function(){
            if(resid) saveToUse(dayluck, resid, day, sx);
            setLunar();
            $.mobile.changePage( $("#ask"), { changeHash: false } );
            enabledBtn("#dataSubmit");
        },
        function(error, failingQuery){ //Failure
            enabledBtn("#dataSubmit");
            _alert("Error: " + error.message);
        }
    );
}

//更新公历和农历时间显示
function setLunar () {
    var dt = new Date();
    var lll = new lunarDate();
	var ld = lll.ganzhi(dt);
	var rd = lll.toLunarDate(dt);
    var y = dt.getFullYear();
    var m = dt.getMonth()+1;
    var d = dt.getDate();
    m = (m < 10) ? "0" + m : m;
    d = (d < 10) ? "0" + d : d;
    $("#lunarDate").html('<em class="years">'+y+'-'+m+'-'+d+'</em>，<em class="nongl">'+ld.y+'年</em><em class="animals">['+ld.animal+'年]</em> <em class="nongl">'+rd.toString()+'</em>');
    $("#ask_lunar").html('<em class="years">'+y+'-'+m+'-'+d+'</em>，<em class="nongl">'+ld.y+'年</em><em class="animals">['+ld.animal+'年]</em> <em class="nongl">'+rd.toString()+'</em>');
    //document.write(ld.lYear + "（" + ld.aYear + "）年" + ld.lMonth + "月" + ld.lDay + ld.lHour + "时");
}

//判断用户今天是否询问过此事项
function chkToUse (cid, today, sx) {
	if(window.localStorage.getItem("expiry_"+sx+"_"+USERID) != today){
	    window.localStorage.removeItem("cate_"+sx+"_"+USERID+"_"+cid);
	    return false;
	}
	return window.localStorage.getItem("cate_"+sx+"_"+USERID+"_"+cid);
}

//保存用户的问询结果，保证一天内一个事项对应同一个结果
//**cid=分类id,id=结果id,today=今天的时间
function saveToUse (cid,id, today, sx) {
    window.localStorage.setItem("expiry_"+sx+"_"+USERID, today);
    window.localStorage.setItem("cate_"+sx+"_"+USERID+"_"+cid, id);
}

//清除用户的过期问询记录
function clearUse () {
    window.localStorage.clear();
}

//问一问
function startAsk (e) {
    preventBehavior(e);
    askType = 0;
    submitAskData();
}

//继续问
function goOnAsk (e) {
    preventBehavior(e);
    askType = 1;
    submitAskData();
}

//查询事项，获得结果
function submitAskData () {
    $("#wait .waitt s").addClass("spin");
	$("#wait .waitt s").css("webkitAnimationPlayState","running");
    $.mobile.changePage( $("#wait"), { transition: "none", changeHash: false } );
    //document.getElementById("sz2").play();
    var sx = $("#sxv").val();
    
    if(tester){
        var rand = rander();
        var day = '1';
    }else{
        var rand = rander();
        var day = getMonthDate();
    }
    var sel = (askType == 0) ? "#select-choice-1" : "#cate_value_goon";
    var cate = $(sel).val();
    CID = cate;
    var resid = chkToUse(cate, day, sx), sql, data;
    if(resid) {
        sql = "SELECT * FROM hauldata WHERE id = ? LIMIT 1;";
        data = [resid];
    }else{
        sql = "SELECT * FROM hauldata WHERE borntag = ? AND day = ? AND randomId = ? AND catid = ? LIMIT 1;";
        data = [sx,day,rand,cate];
    }
    html5sql.process(
        [
            {
                "sql": sql,
                data: data,
                success: function(tx,data){
	                if(data.rows.length == 0){
		                _alert("没有获取到相应数据");
		                return ;
	                }
                    if(!resid) resid = data.rows.item(0).id;
                    $("#ask_lucky").html(data.rows.item(0).content);
                }
            },
            {
                "sql": "SELECT * FROM category WHERE categoryId != 1;",
                data: [],
                success: function(tx,data){
                    //if(window.console) console.log(data.rows.item(0).content);
                    var len = data.rows.length, arr = [];
                    for (var i = 0; i < len; i++) {
                        if(cate == data.rows.item(i).categoryId){
                            $("#ask_things").html(data.rows.item(i).name);
                            continue;
                        }
                        arr.push("<option value='",data.rows.item(i).categoryId,"'>",data.rows.item(i).name,"</option>");
                    };
                    $("#cate_value_goon").html(arr.join(""));
                    if(askType == 1) $("#cate_value_goon").selectmenu("refresh");
                }
            }
        ],
        function(){
            if(resid) saveToUse(cate, resid, day, sx);
            $("#stopSpin").css("visibility","visible");
            //waitDelay = setTimeout(gotoResult, 3000);
        },
        function(error, failingQuery){ //Failure
            _alert("Error: " + error.message);
        }
    );
}

//测试函数，移除本地数据表
function __removeTestData () {
    html5sql.process(
        "DROP TABLE IF EXISTS hauldata;DROP TABLE IF EXISTS category;",
        function(){ //Success
            $("#database").text("Success~~");
        },
        function(error, failingQuery){ //Failure
            $("#database").text("Error: " + error.message);
        }
    );
}

//初始化注册事件
if(debug){
    document.addEventListener("DOMContentLoaded", init, false);
}else{
    document.addEventListener("DOMContentLoaded", function(){
	    //阻止拖拽页面
		document.addEventListener("touchmove", preventBehavior, false);
		//设备准备完毕
        document.addEventListener("deviceready", init, false);
    }, false);
}
$(document).bind("mobileinit", function(){
    $.mobile.loadingMessage = false;
    $.mobile.defaultPageTransition = "slide";
    $.mobile.hashListeningEnabled = true;
    $.mobile.pushStateEnabled = false;
    $.mobile.ajaxEnabled = false;
    $.mobile.defaultDialogTransition = "none";
});