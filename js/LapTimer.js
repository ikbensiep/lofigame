export default class LapTimer {

  constructor(player) {
    this.player = player;
    this.laps = [];
    this.currentLap = {start: undefined, sectors:[]};
    this.timingBlocks = [];
    this.point = {};
    this.lapCounter = this.player.hud.element.querySelector('.thislap');
    this.holdSectorTime = false;

    this.timerInterval = 0;
  }


  init () {
    let svgDoc = document.querySelector('#iframe').contentDocument;
    this.timingBlocks = svgDoc.querySelectorAll('#timing > *');
    this.point = svgDoc.documentElement.createSVGPoint();
    this.update(0, 0);
    console.log('⌚ laptimer init');
  }

  update (deltaTime) {

    let now = new Date().getTime()
    this.point.x = this.player.position.x;
    this.point.y = this.player.position.y;

    if(this.timingBlocks[0].isPointInFill(this.point) && this.currentLap.sectors.length == 0) {
      this.currentLap.sectors.push(now);
      
      let msg = ((this.currentLap.sectors[0] - this.currentLap.start) / 1000).toFixed(3);
      this.player.hud.postMessage('timing', 'thislap', msg);
      this.holdSectorTime = true;
    }

    if(this.timingBlocks[1].isPointInFill(this.point) && this.currentLap.sectors.length == 1) {
      this.currentLap.sectors.push(now);

      let msg = ((this.currentLap.sectors[1] - this.currentLap.start) / 1000).toFixed(3);
      this.player.hud.postMessage('timing', 'thislap', msg);
      this.holdSectorTime = true;
    }

    if(this.timingBlocks[2].isPointInFill(this.point)) {
      
      // no sectors recorded yet, set lap start time
      if( this.currentLap.sectors.length == 0) {
        this.currentLap.start = new Date().getTime();
        this.lapCounter.dataset['lap'] = this.laps.length + 1;
      }

      // record final sector, set new lap start time
      if(this.currentLap.sectors.length == 2) {
        this.currentLap.sectors.push(now);
        this.laps.push(this.currentLap);

        let msg = ((this.currentLap.sectors[2] - this.currentLap.start) / 1000).toFixed(3);
        this.player.hud.postMessage('timing', 'lastlap', msg);
        this.player.hud.postMessage('timing', 'thislap', msg);
        this.holdSectorTime = true;

        this.currentLap = {start: now, sectors: []};
      }
      
    }

    if(this.timerInterval > 7500) {
      this.holdSectorTime = false;
      this.timerInterval = 0;
    }

    if(!this.holdSectorTime) {
      let time = ((new Date().getTime() - this.currentLap.start) / 1000).toFixed(1)
      this.player.hud.postMessage('timing', 'thislap', time);
    }
    
    this.timerInterval += deltaTime;
    
  }

}