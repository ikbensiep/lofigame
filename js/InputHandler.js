export default class InputHandler {
  constructor(game) {

    let mobileControls = document.querySelectorAll('.controls input');
    this.game = game;
    this.keys = [];
  
    this.gamepad = navigator.getGamepads()[0];

    window.addEventListener('keydown', e => {
      if( ( e.key === 'ArrowDown' ||
            e.key === 'ArrowUp' ||
            e.key === 'ArrowLeft' ||
            e.key === 'ArrowRight' ||
            e.key === 'Shift' ||
            e.key === 'CapsLock' ||
            e.key === 'a' ||
            e.key === 'z' ||
            e.key === 'd' ||
            e.key === '`' ||
            e.key === 'Escape') && this.keys.indexOf(e.key)  === -1) {
        this.keys.push(e.key);
      }
      
    });

    window.addEventListener('keyup', e => {
      if( e.key === 'ArrowDown' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'Shift' ||
      e.key === 'CapsLock' ||
      e.key === 'a' ||
      e.key === 'z' ||
      e.key === 'd' ||
      e.key === '`' ||
      e.key === 'Escape') {
        this.keys.splice(this.keys.indexOf(e.key), 1);
      }
    });

    window.addEventListener('gamepadconnected', e => {
      this.gamepad = e.gamepad;
      this.game.player.hud.postMessage('racecontrol','notice', `${this.gamepad.id} connected`, true);
    });

    window.addEventListener('gamepaddisconnected', e => {
      this.game.player.hud.postMessage('racecontrol','notice', `${this.gamepad.id} disconnected :(`, true);
      this.gamepad = null;
    });


    mobileControls.forEach( control => control.addEventListener('input', (e) => this.handleMobileControls(e)))
    
  }

  // so apparently, in Chrome, you have to fetch the controller every damn frame
  updateGamePad() {
    let pad = navigator.getGamepads()[0];
    if (pad) this.gamepad = pad;
  }

}

