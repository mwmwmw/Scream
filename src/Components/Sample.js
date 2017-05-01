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

	stream () {

		// navigator.permissions.query({name:'microphone'}).then(function(result) {
		// 	if (result.state == 'granted') {
		//
		// 	} else if (result.state == 'prompt') {
		//
		// 	} else if (result.state == 'denied') {
		//
		// 	}
		// 	result.onchange = function() {
		//
		// 	};
		// });

		navigator.mediaDevices.getUserMedia({ audio: true, video: false })
			.then((stream) => {

				var context = this.context;
				var input = context.createMediaStreamSource(stream);
				var processor = context.createScriptProcessor(1024,1,1);


				input.connect(processor);
				processor.connect(this.context.destination);

				processor.onaudioprocess = (e) => {
					this.buffer = e.inputBuffer;

					this.buffer.buffer.set(e.inputBuffer, this.buffer.buffer.length);

				};

			})

	}

}