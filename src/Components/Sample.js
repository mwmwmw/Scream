const SAMPLE_BUFFER_SIZE = 1024;

export default class Sample {
	constructor (context) {

		this.context = context;
		this.buffer = this.context.createBuffer(2, 1, this.context.sampleRate);
		this.stream = null;
		this._recordProcessor = null;
	}

	load (path) {
		return fetch(path)
			.then((response) => response.arrayBuffer())
			.then((myBlob) => {
				return this.context.decodeAudioData(myBlob);
			})
			.then((buffer) => {
				this.buffer = buffer;
			})
	}

	record (length = null) {
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
				if(length != null) {
					setTimeout(() => this.stopRecording(), length);
				}
			})
	}
	stopRecording() {
		this._recordProcessor.disconnect();
		this.buffer = this.context.createBuffer(2, this.stream.length, this.context.sampleRate);
		this.buffer.copyToChannel(this.stream, 0);
		this.buffer.copyToChannel(this.stream, 1);
	}

	recordInput (input) {

	}

}