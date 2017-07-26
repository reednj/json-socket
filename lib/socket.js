define(['exports', './timed_hash'], function (exports, _timed_hash) {
	'use strict';

	Object.defineProperty(exports, "__esModule", {
		value: true
	});
	exports.JSONSocket = undefined;

	var _timed_hash2 = _interopRequireDefault(_timed_hash);

	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : {
			default: obj
		};
	}

	class JSONSocket {

		constructor(options) {

			this.packetId = 1;
			this.stats = { in: 0, out: 0 };
			this.callbackLookup = new _timed_hash2.default({ maxAgeSec: 30.0 });

			this.options = options || {};
			this.options.url = this.options.url || '';
			this.options.onOpen = this.options.onOpen || function () {};
			this.options.onClose = this.options.onClose || function () {};

			this.options.autoreconnect = this.options.autoreconnect === false ? false : true;
			this.options.autoconnect = this.options.autoconnect === false ? false : true;
			this.options.connectWait = 1;

			if (!this.options.url.startsWith('ws://') && !this.options.url.startsWith('wss://')) {
				if (document.location.protocol == 'https') {
					this.options.url = `wss://${document.location.hostname}` + this.options.url;
				} else {
					this.options.url = `ws://${document.location.hostname}:${document.location.port || '80'}` + this.options.url;
				}
			}

			if (this.options.autoconnect) {
				this.initSocket();
			}
		}

		initSocket() {
			this.ws = new WebSocket(this.options.url);
			this.ws.onclose = this.onClose.bind(this);
			this.ws.onmessage = function (e) {
				// $FlowFixMe
				this.onMessage(JSON.parse(e.data));
			}.bind(this);

			this._whenConnected = new Promise((resolve, reject) => {
				this.ws.onopen = () => {
					this.onOpen();
					resolve(this);
				};
			});
		}

		onOpen() {
			this.options.connectWait = 1.0;
			this.options.onOpen(this, this.ws);
		}

		onClose() {
			this.options.onClose(this, this.ws);

			if (this.options.autoreconnect === true) {
				setTimeout(() => this.open(), this.options.connectWait * 1000);
				this.options.connectWait *= 2;
				this.options.connectWait = this.options.connectWait > 30 ? 30 : this.options.connectWait;
			}
		}

		onMessage(packet) {
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

		callbackKey(packet) {
			if (packet.e.endsWith(":reply")) {
				return `${packet.e}:${(packet.id || 0).toString()}`;
			} else {
				return `${packet.e}:reply:${(packet.id || 0).toString()}`;
			}
		}

		send(eventType, data) {
			if (this.isConnected()) {
				this.packetId += 1;
				var packet = { e: eventType, d: data, id: this.packetId };
				this.ws.send(JSON.stringify(packet));
				this.stats.out++;

				return new Promise((resolve, reject) => {
					this.callbackLookup.add(this.callbackKey(packet), resolve);
				});
			} else {
				return Promise.reject('NOT_CONNECTED');
			}
		}

		addEvent(eventType, fn) {

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

		eventNameToFunction(eventType) {
			if (eventType) {
				var fnName = 'on_' + eventType.toLowerCase();
				return this.options[fnName] || (() => {});
			} else {
				return () => {};
			}
		}

		isConnected() {
			var openState = WebSocket.OPEN || 1; // turns out not all browsers define the state consts
			return this.ws && this.ws.readyState === openState;
		}

		close() {
			this.options.autoreconnect = false;
			this.ws.close();
		}

		open() {
			this.initSocket();
		}

		whenConnected() {
			return this._whenConnected;
		}
	}

	exports.JSONSocket = JSONSocket;
	// global export...
	window.JSONSocket = window.JSONSocket || JSONSocket;
});
//# sourceMappingURL=socket.js.map