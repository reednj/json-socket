define(['exports'], function (exports) {
	'use strict';

	Object.defineProperty(exports, "__esModule", {
		value: true
	});

	function _classCallCheck(instance, Constructor) {
		if (!(instance instanceof Constructor)) {
			throw new TypeError("Cannot call a class as a function");
		}
	}

	var _createClass = function () {
		function defineProperties(target, props) {
			for (var i = 0; i < props.length; i++) {
				var descriptor = props[i];
				descriptor.enumerable = descriptor.enumerable || false;
				descriptor.configurable = true;
				if ("value" in descriptor) descriptor.writable = true;
				Object.defineProperty(target, descriptor.key, descriptor);
			}
		}

		return function (Constructor, protoProps, staticProps) {
			if (protoProps) defineProperties(Constructor.prototype, protoProps);
			if (staticProps) defineProperties(Constructor, staticProps);
			return Constructor;
		};
	}();

	var JSONSocket = exports.JSONSocket = function () {
		function JSONSocket(options) {
			_classCallCheck(this, JSONSocket);

			this.packetId = 1;
			this.stats = { in: 0, out: 0 };
			this.callbackLookup = new TimedHash({ maxAgeSec: 30.0 });

			this.options = options || {};
			this.options.url = this.options.url || '';
			this.options.onOpen = this.options.onOpen || function () {};
			this.options.onClose = this.options.onClose || function () {};

			this.options.autoreconnect = this.options.autoreconnect === false ? false : true;
			this.options.autoconnect = this.options.autoconnect === false ? false : true;
			this.options.connectWait = 1;

			if (!this.options.url.startsWith('ws://') && !this.options.url.startsWith('wss://')) {
				if (document.location.protocol == 'https:') {
					this.options.url = 'wss://' + document.location.hostname + this.options.url;
				} else {
					this.options.url = 'ws://' + document.location.hostname + ':' + (document.location.port || '80') + this.options.url;
				}
			}

			if (this.options.autoconnect) {
				this.initSocket();
			}
		}

		_createClass(JSONSocket, [{
			key: 'initSocket',
			value: function initSocket() {
				var _this = this;

				this.ws = new WebSocket(this.options.url);
				this.ws.onclose = this.onClose.bind(this);
				this.ws.onmessage = function (e) {
					// $FlowFixMe
					this.onMessage(JSON.parse(e.data));
				}.bind(this);

				this._whenConnected = new Promise(function (resolve, reject) {
					_this.ws.onopen = function () {
						_this.onOpen();
						resolve(_this);
					};
				});
			}
		}, {
			key: 'onOpen',
			value: function onOpen() {
				this.options.connectWait = 1.0;
				this.options.onOpen(this, this.ws);
			}
		}, {
			key: 'onClose',
			value: function onClose() {
				var _this2 = this;

				this.options.onClose(this, this.ws);

				if (this.options.autoreconnect === true) {
					setTimeout(function () {
						return _this2.open();
					}, this.options.connectWait * 1000);
					this.options.connectWait *= 2;
					this.options.connectWait = this.options.connectWait > 30 ? 30 : this.options.connectWait;
				}
			}
		}, {
			key: 'onMessage',
			value: function onMessage(packet) {
				if (packet.e && typeof packet.e == 'string') {
					this.stats.in++;
					this.eventNameToFunction(packet.e)(packet.d);

					if (packet.id) {
						var fn = this.callbackLookup.get(this.callbackKey(packet));
						if (fn) {
							fn(packet.d);
						}
					}
				}
			}
		}, {
			key: 'callbackKey',
			value: function callbackKey(packet) {
				if (packet.e.endsWith(":reply")) {
					return packet.e + ':' + (packet.id || 0).toString();
				} else {
					return packet.e + ':reply:' + (packet.id || 0).toString();
				}
			}

			// the type of 'data' has to be 'any', not Object, because it can
			// be set to any serializable type, like array, or string etc

		}, {
			key: 'send',
			value: function send(eventType) {
				var _this3 = this;

				var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

				if (this.isConnected()) {
					this.packetId += 1;
					var packet = { e: eventType, d: data || {}, id: this.packetId };
					this.ws.send(JSON.stringify(packet));
					this.stats.out++;

					return new Promise(function (resolve, reject) {
						_this3.callbackLookup.add(_this3.callbackKey(packet), resolve);
					});
				} else {
					return Promise.reject('NOT_CONNECTED');
				}
			}
		}, {
			key: 'on',
			value: function on(eventType, fn) {
				return this.addEvent(eventType, fn);
			}
		}, {
			key: 'addEvent',
			value: function addEvent(eventType, fn) {

				if (eventType && typeof fn == 'function') {
					var fnName = 'on_' + eventType.toLowerCase();

					if (!this.options[fnName]) {
						this.options[fnName] = fn;
					} else if (typeof this.options[fnName] == 'function') {
						var currentFn = this.options[fnName];
						this.options[fnName] = function () {
							currentFn.apply(this, arguments);
							fn.apply(this, arguments);
						};
					}
				}

				return this;
			}
		}, {
			key: 'eventNameToFunction',
			value: function eventNameToFunction(eventType) {
				if (eventType) {
					var fnName = 'on_' + eventType.toLowerCase();
					return this.options[fnName] || function () {};
				} else {
					return function () {};
				}
			}
		}, {
			key: 'isConnected',
			value: function isConnected() {
				var openState = WebSocket.OPEN || 1; // turns out not all browsers define the state consts
				return this.ws && this.ws.readyState === openState;
			}
		}, {
			key: 'close',
			value: function close() {
				this.options.autoreconnect = false;
				this.ws.close();
			}
		}, {
			key: 'open',
			value: function open() {
				this.initSocket();
			}
		}, {
			key: 'whenConnected',
			value: function whenConnected() {
				return this._whenConnected;
			}
		}]);

		return JSONSocket;
	}();

	var TimedHash = function () {
		function TimedHash(options) {
			_classCallCheck(this, TimedHash);

			this.options = options || {};
			this.options.maxAgeSec = this.options.maxAgeSec || 30.0;
			this.data = {};
			this.lastPurge = Date.now();
		}

		_createClass(TimedHash, [{
			key: 'add',
			value: function add(k, contents) {
				if (this.lastPurge < Date.now() - 1000) {
					this.purge();
				}

				this.data[k] = {
					contents: contents,
					addedAt: Date.now()
				};
			}
		}, {
			key: 'get',
			value: function get(k) {
				return (this.data[k] || {}).contents;
			}
		}, {
			key: 'contains',
			value: function contains(k) {
				return this.data[k] != null;
			}
		}, {
			key: 'purge',
			value: function purge() {
				var _this4 = this;

				this.expiredKeys().forEach(function (k) {
					return delete _this4.data[k];
				});
				this.lastPurge = Date.now();
			}
		}, {
			key: 'count',
			value: function count() {
				return Object.keys(this.data).length;
			}
		}, {
			key: 'expiredKeys',
			value: function expiredKeys() {
				var _this5 = this;

				return Object.keys(this.data).filter(function (k) {
					return _this5.data[k].addedAt < Date.now() - _this5.options.maxAgeSec * 1000;
				});
			}
		}]);

		return TimedHash;
	}();
});
//# sourceMappingURL=socket.js.map