//      
//
class JSONSocket {
	             
	               
	             
	
	constructor(options) {
		this.stats = { in: 0, out: 0 };
		this.options = options || {};
		this.options.url = this.options.url || null;
		this.options.onOpen = this.options.onOpen || function() {};
		this.options.onClose = this.options.onClose || function() {};

		this.options.autoreconnect = this.options.autoreconnect === false ? false : true;
		this.options.autoconnect = this.options.autoconnect === false ? false : true;
		this.options.connectWait = 1;

		if(this.options.autoconnect) {
			this.initSocket();
		}
	}

	initSocket() {
		this.ws = new WebSocket(this.options.url);
		this.ws.onopen = this.onOpen.bind(this);
		this.ws.onclose = this.onClose.bind(this);
		this.ws.onmessage = function(e) {
			// $FlowFixMe
			this.onMessage(JSON.parse(e.data));
		}.bind(this);
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
	
	onMessage(msg                            ) {
		if(msg.event && typeof msg.event == 'string') {
			this.stats.in++;
			(this.eventNameToFunction(msg.event))(msg.data);
		}
	}

	send(eventType       , data) {
		if(this.isConnected()) {
			var str = JSON.stringify({e: eventType, d: data});
			this.ws.send(str);
			this.stats.out++;
		}
	}

	addEvent(eventType       , fn         ) {
		
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

	eventNameToFunction(eventType)          {
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
}
