export default class LapTimer {

  constructor(player) {

    this.player = player;
    this.currentLap = 0;
    this.laps = [{start: null, sectors: []}];

  }

  startLap () {
    let thisLap = this.laps[this.currentLap];
    
    if(thisLap.start) { 
      return;
    } else {
      console.log('startLap', thisLap)
      
      let now = new Date();
      thisLap = {start: now.getTime(), sectors: []};
    }

  }

  setSectorTime () {

    if(this.laps[this.currentLap] || 
      this.laps[this.currentLap].sectors[this.player.currentSector]) return;
    
    let currentTime = new Date();
    console.log('setSectorTime', this.player.currentSector)

    this.laps[this.currentLap].sectors.push( {time: currentTime.getTime()} );

    if(this.laps[this.currentLap].sectors.length == 3) {
      this.currentLap++;
    }

    setTimeout(() => {
      this.player.currentSector++
    }, 5000)


  }



}