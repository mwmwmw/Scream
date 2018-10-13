const SAMPLE_BUFFER_SIZE = 1024;

export default class Sample {
	constructor (context) {

		this.context = context;
		this.buffer = this.context.createBuffer(2, 1, this.context.sampleRate);
		this.rawBuffer = new Float32Array(this.buffer.length);
		this.buffer.copyFromChannel(this.rawBuffer, 1,0);
		this.stream = null;
		this._recordProcessor = null;
		this.overdub = false;
	}

	load (path) {
		return fetch(path)
			.then((response) => response.arrayBuffer())
			.then((myBlob) => {
				return this.context.decodeAudioData(myBlob);
			})
			.then((buffer) => {
				this.rawBuffer = new Float32Array(this.buffer.length);
				this.rawBuffer = buffer.getChannelData(0);
				this.buffer = this.context.createBuffer(2, this.rawBuffer.length, this.context.sampleRate);
				this.buffer.copyToChannel(this.rawBuffer, 0);
				this.buffer.copyToChannel(this.rawBuffer, 1);
				return this;
			})
	}

	reverse () {
		let reverse = new Float32Array(this.rawBuffer);
			reverse.reverse();
		this.buffer = this.context.createBuffer(2, reverse.length, this.context.sampleRate);
		this.buffer.copyToChannel(reverse, 0);
		this.buffer.copyToChannel(reverse, 1);
	}

	pingpong () {
		let offset = this.rawBuffer.length;
		let newArray = new Float32Array(offset * 2);
		let reverse = new Float32Array(this.rawBuffer);
		reverse.reverse();
		newArray.set(this.rawBuffer, 0);
		newArray.set(reverse, offset-1);
		this.buffer = this.context.createBuffer(2, newArray.length, this.context.sampleRate);
		this.buffer.copyToChannel(newArray, 0);
		this.buffer.copyToChannel(newArray, 1);
	}

	normal () {
		this.buffer = this.context.createBuffer(2, this.rawBuffer.length, this.context.sampleRate);
		this.buffer.copyToChannel(this.rawBuffer, 0);
		this.buffer.copyToChannel(this.rawBuffer, 1);
	}

	record () {
		this.buffered = 0;
		this.stream = new Float32Array(0);
		navigator.mediaDevices.getUserMedia({audio: true, video: false})
			.then((stream) => {
				let input = this.context.createMediaStreamSource(stream);
				this._recordProcessor = this.context.createScriptProcessor(SAMPLE_BUFFER_SIZE, 1, 2);

				input.connect(this._recordProcessor);
				this._recordProcessor.connect(this.context.destination);
				this._recordProcessor.onaudioprocess = (e) => {
					let chunk = e.inputBuffer.getChannelData(0);
					var newStream = new Float32Array(this.stream.length + chunk.length);
						newStream.set(this.stream);
						newStream.set(chunk,chunk.length * this.buffered);
						this.stream = newStream;
					this.buffered++;
				};
			})
	}

	stopRecording() {
		this._recordProcessor.disconnect();
		this.rawBuffer = new Float32Array(this.stream.length);
		this.rawBuffer = this.ramp(this.stream);
		this.buffer = this.context.createBuffer(2, this.stream.length, this.context.sampleRate);
		this.buffer.copyToChannel(this.rawBuffer, 0);
		this.buffer.copyToChannel(this.rawBuffer, 1);
	}

	ramp(buffer) {
		let newBuffer = buffer; 
		const BUFFER_SIZE = 512;
		if(newBuffer.length > BUFFER_SIZE) {
			for(var i = 0; i < BUFFER_SIZE; i++) {
				newBuffer[i] = newBuffer[i] * i / BUFFER_SIZE; 
			}
			var j = BUFFER_SIZE;
			for(var i = newBuffer.length-BUFFER_SIZE; i < newBuffer.length; i++) {
				j--;
				newBuffer[i] = newBuffer[i] * j / BUFFER_SIZE; 
			}
		}
		return newBuffer;
	}

	overwrite () {
		this._recordProcessor.disconnect();
		var bufferlength = 0;
		if (this.stream.length > this.buffer.length) {
			bufferlength = this.stream.length;
		} else {
			bufferlength = this.buffer.length;
		}
		let mixedBuffer = new Float32Array(bufferlength);
		let bufferA = this.stream;
		let bufferB = new Float32Array( this.buffer.length);
		this.buffer.copyFromChannel(bufferB, 1, 0);
		for(let i = 0; i < bufferlength; i++) {
			let aValue = 0;
			let bValue = 0;
			if(bufferA[i] != undefined) {
				aValue = bufferA[i];
			}
			if(bufferB[i] != undefined) {
				bValue = bufferB[i];
			}
			mixedBuffer[i] = aValue + bValue;
		}
		this.rawBuffer = this.ramp(mixedBuffer);
		this.buffer = this.context.createBuffer(2, bufferlength, this.context.sampleRate);
		this.buffer.copyToChannel(this.rawBuffer, 0);
		this.buffer.copyToChannel(this.rawBuffer, 1);
		this.overdub = false;
	}
}