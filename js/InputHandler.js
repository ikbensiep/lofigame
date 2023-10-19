export default class InputHandler {
  constructor() {

    let mobileControls = document.querySelectorAll('.controls input');
    this.keys = [];
    this.mobile = {accel: 0, steer: 0}
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
      // console.log(e.key);
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
      console.log('connected: ', this.gamepad.id);
    });

    window.addEventListener('gamepadconnected', e => {
      this.gamepad = null;
      console.log('disconnected: ', this.gamepad.id);
    });


    mobileControls.forEach( control => control.addEventListener('input', (e) => this.handleMobileControls(e)))
    
  }

  handleMobileControls (e) {
    this.mobile[e.target.name] = e.target.value;
    console.log(this.mobile, e)
  }
}

