export default class LapTimer {

  constructor(player) {
    this.player = player;
    this.currentLap = 0;
    this.currentSector = 0;
    this.laps = [{start: 0, sectors: []}];
  }

  startLap () {
    let thisLap = this.laps[this.currentLap];

    document.querySelector('.thislap').dataset.lap = this.currentLap;

    // if lap has a start time, do nothing
    if(thisLap.start !== 0) { 
      console.warn(thisLap);
      return;
    } else {

      let now = new Date();
      thisLap = {start: now.getTime(), sectors: []};

      console.log('startLap', thisLap)
    }

  }

  setSectorTime () {

    if(this.laps[this.currentLap]?.sectors[this.currentSector]) {
        return;
      }
    
    let currentTime = new Date();
    console.log('setSectorTime', this.player.currentSector)

    this.laps[this.currentLap].sectors.push( currentTime.getTime() );

    if(this.laps[this.currentLap].sectors.length == 3) {
      this.currentLap++;
    }

    setTimeout(() => {
      this.player.currentSector++
    }, 5000)

  }
}