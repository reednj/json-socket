// @flow

/* export default */ class TimedHash {
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

