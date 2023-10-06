export default class HeadsupDisplay { 
  constructor (game) {
    this.game = game;
    this.player = game.player;
    this.element = this.game.camera.querySelector('.hud');
  }

  postMessage(section, type, message) {
    console.log(section, type, message)
    this.element.querySelector(`.${section} .${type}`).textContent = message;
  }
}