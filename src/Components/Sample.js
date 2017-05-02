export default class Sample {
	constructor (context) {

		this.context = context;
		this.buffer = this.context.createBuffer(2, this.context.sampleRate * 2, this.context.sampleRate);
		this.stream = null
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

	record (length = 2000) {

		this.buffered = 0;

		this.stream = new Float32Array(this.context.sampleRate * length / 1000);

		navigator.mediaDevices.getUserMedia({audio: true, video: false})
			.then((stream) => {

				let input = this.context.createMediaStreamSource(stream);
				let processor = this.context.createScriptProcessor(2048, 1, 2);

				input.connect(processor);
				processor.connect(this.context.destination);
				processor.onaudioprocess = (e) => {
					let chunk = e.inputBuffer.getChannelData(0);
					if (chunk.length * this.buffered < this.stream.length) {
						this.stream.set(chunk, chunk.length * this.buffered);
						this.buffered++;
					}
				};
				setTimeout(() => {
					processor.disconnect();
					this.buffer.copyToChannel(this.stream, 0);
					this.buffer.copyToChannel(this.stream, 1);
				}, length);
			})

	}

}