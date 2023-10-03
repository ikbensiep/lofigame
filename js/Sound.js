export default class Sound {
  constructor(options) {
		this.url = options.url;
    this.loop = true;
    this.fadein = options.fadein;

    this.AudioContext = window.AudioContext || window.webkitAudioContext
    this.audioCtx = null
    this.sourceBuffer = null
    this.gainNode = null
    this.gain = 0
    this.interval = null

    this.init();
  }

  init () {
		this.audioCtx = new this.AudioContext();
		this.gainNode = this.audioCtx.createGain();
		this.gainNode.connect(this.audioCtx.destination);
		this.gainNode.gain.value = this.gain ? this.gain : this.fadein ? 0.0 : 0.05;
		this.sourceBuffer = this.audioCtx.createBufferSource();
		this.getSound();

	}

	getSound () {

		var url = this.url;
		var request = new XMLHttpRequest();
		request.open("GET", url, true);
		request.responseType = 'arraybuffer';

		request.onload = () => {

			var undecodedAudio = request.response;
			this.audioCtx.decodeAudioData(undecodedAudio, (buffer) => {

			// Tell the AudioBufferSourceNode to use this AudioBuffer.
			this.sourceBuffer.buffer = buffer;
			this.sourceBuffer.connect(this.gainNode);
			this.sourceBuffer.loop = this.loop;
			this.sourceBuffer.playbackRate.value = 1;

			if( this.fadein) {
				
				this.interval = setInterval(() => { this.fadeIn()}, 100);
			}

			this.sourceBuffer.start(this.audioCtx.currentTime);
			
			});
		};

		request.send();
	}

	fadeIn () {
		
		if(this.gain < 0.25) {
			this.gain += 0.002;
			this.updateGain(this.gain);
			
		} else {
			this.interval = clearInterval(this.interval);
			
		}
	}

	updateGain (level) {
		this.gainNode.gain.value = level;
	}

	toggleLoop() {
		this.sourceBuffer.loop = !this.sourceBuffer.loop;
	}

	stopSound () {
		this.sourceBuffer.stop();
	}

}

