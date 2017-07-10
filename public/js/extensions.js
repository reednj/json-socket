
(function () {
	var extend = function(name, fn) {
		if(!this.prototype[name])
			this.prototype[name] = fn;

		return this;
	};

	if(!Function.prototype.extend) {
		Function.prototype.extend = extend;
	}

	if(!Element.prototype.extend) {
		Element.implement = extend;
		Element.prototype.extend = extend;
	}

})();

(function() {
	Function.extend('delay', function(time_ms, scope) {
		return setTimeout(this.bind(scope), time_ms);
	});

	Function.extend('periodical', function(time_ms, scope) {
		return setInterval(this.bind(scope), time_ms);
	});
})();