// @flow

export type Packet = {
	e:string,
	d:Object,
	id?:number
}

export class JSONSocket {
	ws:WebSocket;
	options:Object;
	packetId:number;
	callbackLookup:TimedHash;
	stats:{in:number,out:number};
	_whenConnected:Promise<*>;	
	constructor(options:Object) {

		this.packetId = 1;
		this.stats = { in: 0, out: 0 };
		this.callbackLookup = new TimedHash({ maxAgeSec: 30.0 });

		this.options = options || {};
		this.options.url = this.options.url || '';
		this.options.onOpen = this.options.onOpen || function() {};
		this.options.onClose = this.options.onClose || function() {};

		this.options.autoreconnect = this.options.autoreconnect === false ? false : true;
		this.options.autoconnect = this.options.autoconnect === false ? false : true;
		this.options.connectWait = 1;

		if(!this.options.url.startsWith('ws://') && !this.options.url.startsWith('wss://')) {
			if(document.location.protocol == 'https') {
				this.options.url = `wss://${document.location.hostname}` + this.options.url
			} else {
				this.options.url = `ws://${document.location.hostname}:${document.location.port || '80'}` + this.options.url;
			}
		}

		if(this.options.autoconnect) {
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
			}
		});
	}
	
	onOpen() {
		this.options.connectWait = 1.0;
		this.options.onOpen(this, this.ws);
	}
	
	onClose() {
		this.options.onClose(this, this.ws);

		if(this.options.autoreconnect === true) {
			setTimeout(() => this.open(), this.options.connectWait * 1000);
			this.options.connectWait *= 2;
			this.options.connectWait = this.options.connectWait > 30 ? 30 : this.options.connectWait;
		}
	}
	
	onMessage(packet:Packet) {
		if(packet.e && typeof packet.e == 'string') {
			this.stats.in++;
			(this.eventNameToFunction(packet.e))(packet.d);

			if(packet.id) {
				var fn = this.callbackLookup.get(this.callbackKey(packet));
				if(fn) {
					fn(packet.d);
				}
			}
		}
	}

	callbackKey(packet:Packet) {
		if(packet.e.endsWith(":reply")) {
			return `${packet.e}:${(packet.id || 0).toString()}`;
		} else {
			return `${packet.e}:reply:${(packet.id || 0).toString()}`;
		}
	}

	send(eventType:string, data:any) {
		if(this.isConnected()) {
			this.packetId += 1;
			var packet:Packet = {e: eventType, d: data, id: this.packetId}
			this.ws.send(JSON.stringify(packet));
			this.stats.out++;

			return new Promise((resolve, reject) => {
				this.callbackLookup.add(this.callbackKey(packet), resolve);
			});
			
		} else {
			return Promise.reject('NOT_CONNECTED');
		}
	}

	addEvent(eventType:string, fn:Function) {
		
		if(eventType && typeof fn == 'function') {
			var fnName = 'on_' + eventType.toLowerCase();
			
			if(!this.options[fnName]) {
				this.options[fnName] = fn;
			} else if(typeof this.options[fnName] == 'function') {
				var currentFn = this.options[fnName];
				this.options[fnName] = function() {
					currentFn.apply(this, arguments);
					fn.apply(this, arguments);
				};
			}
		}

		return this;
	}

	eventNameToFunction(eventType:string):Function {
		if(eventType) {
			var fnName = 'on_' + eventType.toLowerCase();
			return this.options[fnName] || (()=>{});
		} else {
			return (()=>{});
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

class TimedHash {
	lastPurge:number;
	data:{};
	options:{ maxAgeSec:number };

	constructor(options:Object) {
		this.options = options || {};
		this.options.maxAgeSec = this.options.maxAgeSec || 30.0;
		this.data = {};
		this.lastPurge = Date.now();
	}

	add(k:string, contents:Object) {
		if(this.lastPurge < Date.now() - 1000) {
			this.purge();
		}

		this.data[k] = { 
			contents:contents,
			addedAt: Date.now()
		};
	}

	get(k:string) {
		return (this.data[k] || {}).contents;
	}

	contains(k:string) {
		return this.data[k] != null;
	}

	purge() {
		this.expiredKeys().forEach((k) => delete this.data[k]);
		this.lastPurge = Date.now();
	}

	count() {
		return Object.keys(this.data).length
	}

	expiredKeys():string[] {
		return Object.keys(this.data).filter((k) => {
			return this.data[k].addedAt < Date.now() - this.options.maxAgeSec * 1000;
		});
	}
}

