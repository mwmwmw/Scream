import Sample from "./Sample";

export default class SampleMap {
	constructor (context, sample_map) {
		this.context = context;
		this.input_map = sample_map;
		this.samples = {};
		this.loaded = false;
	}

	load () {
		let sampleLoad = [];
		this.input_map.forEach((sample)=>{
			let newsample = new Sample(this.context);
			newsample.load(sample.src).then(() => {
				this.samples[sample.value] = Object.assign(sample, {sample:newsample});
			});
			sampleLoad.push(newsample);
		});
		return Promise.all(sampleLoad);
	}

}