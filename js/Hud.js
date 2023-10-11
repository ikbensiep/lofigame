export default class HeadsupDisplay { 
  constructor (game) {
    this.game = game;
    this.player = game.player;
    this.element = this.game.camera.querySelector('.hud');
    this.section = '';
    this.type = '';
    this.message = '';
  }

  postMessage(section, type, message) {
    if(this.message !== message) {
      this.message = message;
      this.element.querySelector(`.${section} .${type}`).textContent = message;
    }
  }
}