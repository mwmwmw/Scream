const SAMPLE_BUFFER_SIZE = 2048;

const PLAYBACK_MODE = {
	NORMAL: "NORMAL",
	PING_PONG: "PING_PONG",
	REVERSE: "REVERSE",
}

export const RECORD_MODE = {
	USER_MEDIA: "USER_MEDIA",
	STREAM: "STREAM"
}

export default class Sample {
	constructor (context, recordMode = RECORD_MODE.USER_MEDIA, rawBuffer = new Float32Array(1)) {
		this.recordMode = recordMode;
		this._recordStream = null;
		if(this.recordMode === RECORD_MODE.USER_MEDIA) {
			this.recordInput = context.createGain();
		} else {
			this.recordInput = context.createMediaStreamDestination();
		}
		this.context = context;
		this.buffer = this.context.createBuffer(2, rawBuffer.length, this.context.sampleRate);
		this.rawBuffer = rawBuffer.slice();
		
		this.stream = null;
		this._recordProcessor = null;
		this.overdub = false;
		this.normalize = false;
		this.playbackMode = PLAYBACK_MODE.NORMAL;
		this.copyRawToBuffer(this.rawBuffer);
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
				this.setBuffer();
				return this;
			})
	}

	reverse () {
		this.playbackMode = PLAYBACK_MODE.REVERSE;
		let reverse = this.rawBuffer.slice().reverse();
		this.copyRawToBuffer(reverse);
	}

	pingpong () {
		this.playbackMode = PLAYBACK_MODE.PING_PONG;
		let newArray = new Float32Array(this.rawBuffer.length * 2);
		newArray.set(this.rawBuffer, 0);
		newArray.set(this.rawBuffer.slice().reverse(), this.rawBuffer.length-1);
		this.copyRawToBuffer(newArray);
	}

	normal () {
		this.playbackMode = PLAYBACK_MODE.NORMAL;
		this.copyRawToBuffer(this.rawBuffer);
	}

	record(cb = () => {}) {
		switch(this.recordMode) {
			case RECORD_MODE.STREAM:
				this.recordStream(this.recordInput.stream, cb);
			break;
			case RECORD_MODE.USER_MEDIA:
				navigator.mediaDevices.getUserMedia({audio: true, video: false})
				.then((stream) =>this.recordStream(stream, cb))
			break;
		}
	}

	recordStream(stream, cb = ()=>{}) {
			this.buffered = 0;
			this.stream = new Float32Array(0);
			this._recordStream = this.context.createMediaStreamSource(stream);
			this._recordProcessor = this.context.createScriptProcessor(SAMPLE_BUFFER_SIZE, 1, 2);
			this._recordStream.connect(this._recordProcessor);
			this._recordProcessor.connect(this.context.destination);
			this._recordProcessor.onaudioprocess = (e) => {
				let chunk = e.inputBuffer.getChannelData(0);
				var newStream = new Float32Array(this.stream.length + chunk.length);
					newStream.set(this.stream);
					newStream.set(chunk,chunk.length * this.buffered);
					this.stream = newStream;
				this.buffered++;
				cb(this.stream.length, this.buffered);
			};
	}

	stopRecording() {
		this._recordStream.disconnect(this._recordProcessor);
		this._recordProcessor.disconnect(this.context.destination);
		this._recordProcessor.onaudioprocess = null;
		this._recordProcessor.disconnect();

		let recordedBuffer = this.ramp(this.stream);

		if(this.overdub) {
			let mixedBuffer = this.mixRawBuffers(recordedBuffer, this.rawBuffer);
			this.rawBuffer = mixedBuffer;
		} else {
			this.rawBuffer = recordedBuffer;
		}

		this.setBuffer();
		
	}

	setBuffer() {
		switch(this.playbackMode) {
			case PLAYBACK_MODE.NORMAL:
				this.normal();
				break;
			case PLAYBACK_MODE.PING_PONG:
				this.pingpong(); 
				break;
			case PLAYBACK_MODE.REVERSE:
				this.reverse(); 
				break;
			default:
				this.normal();
				break;
		}
	}

	copyRawToBuffer(rawBuffer) {
		let copyBuffer = rawBuffer;
		if(this.normalize) {
			copyBuffer = this.normalize(copyBuffer);
		}
		this.buffer = this.context.createBuffer(2, copyBuffer.length, this.context.sampleRate);
		this.buffer.copyToChannel(copyBuffer, 0);
		this.buffer.copyToChannel(copyBuffer, 1);
	}

	trim(buffer) {
		let startIndex = 0;
		for(let i = 0; i<buffer.length; i++) {
			if(buffer[i] > 0) {
				startIndex = i;
				break;
			}
		}
		return buffer.slice(startIndex);
	}

	ramp(buffer) {
		let newBuffer = this.trim(buffer); 
		const BUFFER_SIZE = 512;
		if(newBuffer.length > BUFFER_SIZE) {
			for(let i = 0; i < BUFFER_SIZE; i++) {
				newBuffer[i] = newBuffer[i] * i / BUFFER_SIZE; 
			}
			var j = BUFFER_SIZE;
			for(let i = newBuffer.length-BUFFER_SIZE; i < newBuffer.length; i++) {
				j--;
				newBuffer[i] = newBuffer[i] * j / BUFFER_SIZE; 
			}
		}
		return newBuffer;
	}

	normalize(buffer) {
		const b = buffer.slice();
	
		const va = -0.98; // a
		const vb = 0.98;  // b
	
		let vmin = -(1-0.98); // A
		let vmax = (1-0.98); // B
	
		b.forEach(v=>{
			if(v>vmax) {vmax = v};
			if(v<vmin) {vmin = v};
		});
	
		return b.map(v=>{
			return va + (v - vmin) * (vb - va) / (vmax - vmin);
		})
	}

	mixRawBuffers(bufferA, bufferB) {
		let bufferLength = this.getLongestBuffer(bufferA, bufferB);
		let mixedBuffer = new Float32Array(bufferLength);
		
		for(let i = 0; i < bufferLength; i++) {
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

		return mixedBuffer;
	}

	getLongestBuffer(bufferA, bufferB) {
		return bufferA.length > bufferB.length ? bufferA.length : bufferB.length;
	}

}