export default class Sample {
	constructor (context) {

		this.context = context;
		this.buffer = null;

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

	stream() {}

}