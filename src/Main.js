import MizzyDevice from "./MizzyDevice";
import Mizzy from "mizzy";
import Voice from "./Voices/Voice";


export default class Vincent extends MizzyDevice {

		constructor() {
			super();

			this.context = new (window.AudioContext || window.webkitAudioContext)();
			this.merge = this.context.createChannelMerger(8);
			//this.merge.connect();
			this.voices = [];

			var m = new Mizzy();
			m.initialize();
			m.bindKeyboard();
			m.keyToggle((e)=>{
				let voice = new Voice(this.context);
					voice.connect(this.context.destination);
					voice.on(e);
					this.voices.push(voice);

			}, (e)=>{
				this.voices.forEach((voice,i) => {
					if(voice.value = e.value) {
						var off = voice.off(e);
						this.voices.splice(i, 1);
					}
				})
			})

		}
}

var vincent = new Vincent();