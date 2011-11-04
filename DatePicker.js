/**
	Phonegap DatePicker Plugin
	Copyright (c) Greg Allen 2011
	MIT Licensed
**/
if (typeof PhoneGap !== "undefined") {
    /**
     * Constructor
     */
    function DatePicker() {
        this._callback;
    }

    /**
     * show - true to show the ad, false to hide the ad
     */
    DatePicker.prototype.show = function(options, cb) {
        if (options.date) {
            options.date = (options.date.getMonth()+1)+"/"+(options.date.getDate())+"/"+(options.date.getFullYear());
        }
        var defaults = {
            mode: '',
            date: '',
            title: '',
            allowOldDates: true
        }
        for (var key in defaults) {
            if (typeof options[key] !== "undefined")
                defaults[key] = options[key];
        }
        this._callback = cb;
        PhoneGap.exec("DatePicker.show", defaults);
    }

    DatePicker.prototype._dateSelected = function(date) {
        var d = new Date(parseFloat(date)*1000);
        if (this._callback)
            this._callback(d);
    }
    
    function Prompt() {
	
	}
	
	Prompt.prototype.show = function(title, val, okCallback, cancelCallback, okButtonTitle, cancelButtonTitle) { 
	
	    var defaults = {
	        title : title,
	        val : val,
	        okButtonTitle : (okButtonTitle || "Ok"),
	        cancelButtonTitle : (cancelButtonTitle || "Cancel")
	    };
	
	    var key = 'f' + this.callbackIdx++;
	    window.plugins.Prompt.callbackMap[key] = {
	        okCallback: function(msg) {
	            if (okCallback && typeof okCallback === 'function') {
	                okCallback(msg);
	            }
	            delete window.plugins.Prompt.callbackMap[key];
	        },
	        cancelCallback: function() {
	            if (cancelCallback && typeof cancelCallback === 'function') {
	                cancelCallback();
	            }
	            delete window.plugins.Prompt.callbackMap[key];
	        }
	    };
	    var callback = 'window.plugins.Prompt.callbackMap.' + key;
	    PhoneGap.exec("Prompt.show", callback, defaults);
	};
	
	Prompt.prototype.callbackMap = {};
	Prompt.prototype.callbackIdx = 0;
	
	PhoneGap.addConstructor(function() {
	    if(!window.plugins) {
	        window.plugins = {};
	    }
	    window.plugins.datePicker = new DatePicker();
	    window.plugins.Prompt = new Prompt();
	});

};
