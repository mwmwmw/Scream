import MizzyDevice from "./MizzyDevice";
import Mizzy from "mizzy";
import Voice from "./Voices/Voice";


export default class Vincent extends MizzyDevice {

		constructor() {
			super();

			this.context = new (window.AudioContext || window.webkitAudioContext)();
			this.merge = this.context.createChannelMerger(8);
			this.merge.connect(this.context.destination);
			this.voices = [];
			for(var i = 0; i < 1; i++) {
				let voice = new Voice(this.context);
				voice.connect(this.merge, i);
				this.voices.push(voice);
			}
			var m = new Mizzy();
			m.initialize();
			m.bindKeyboard();
			m.keyToggle((e)=>{
				this.voices.forEach((voice) => {
					if(!voice.inUse) {
						voice.on(e);
					}
				})
			}, (e)=>{
				this.voices.forEach((voice) => {
					if(voice.value = e.value) {
						voice.off(e);
					}
				})
			})

		}
}

var vincent = new Vincent();