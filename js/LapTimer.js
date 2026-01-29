export default class LapTimer {

  constructor(player) {
    this.player = player;
    this.laps = [];
    this.currentLap = {start: undefined, sectors:[]};
    this.timingBlocks = [];
    this.point = {};
    this.lapCounter = this.player.hud.element.querySelector('.thislap');
    this.holdSectorTime = false;
    this.sessionTimes = window.sessionmenu.querySelector('table');
    this.timerInterval = 0;
  }


  init () {
    let svgDoc = document.querySelector('#iframe').contentDocument;
    this.timingBlocks = svgDoc.querySelectorAll('#timing > *');
    this.point = svgDoc.documentElement.createSVGPoint();

    console.info('⌚ laptimer init');
  }

  update (deltaTime) {

    let now = new Date().getTime()
    this.point.x = this.player.position.x;
    this.point.y = this.player.position.y;

    if ( this.timingBlocks[0].isPointInFill(this.point)
      && this.currentLap.sectors.length == 0 
      && this.currentLap.start ) {
      
      this.currentLap.sectors.push(now);

      let msg = ((this.currentLap.sectors[0] - this.currentLap.start) / 1000).toFixed(3);
      this.player.hud.postMessage('timing', 'thislap', msg);

      if(this.laps.length > 0) {
        if(this.isFastestSector(0)) {
          this.lapCounter.classList.add('fastest');
          this.player.hud.postMessage('team', 'radio', `Fastest sector ${this.currentLap.sectors.length} time, keep pushing.`, true);
        }
      }

      this.holdSectorTime = true;
    }

    if(this.timingBlocks[1].isPointInFill(this.point) && this.currentLap.sectors.length == 1) {
      this.currentLap.sectors.push(now);

      let msg = ((this.currentLap.sectors[1] - this.currentLap.start) / 1000).toFixed(3);
      this.player.hud.postMessage('timing', 'thislap', msg);
      
      if(this.laps.length > 0) {
        if(this.isFastestSector(1)) {
          this.lapCounter.classList.add('fastest');
          this.player.hud.postMessage('team', 'radio', `Noice. That's your best sector ${this.currentLap.sectors.length} time so far!`, true);
        }
      }

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
        this.currentLap.laptime = now - this.currentLap.start;
        this.laps.push(this.currentLap);

        let lastLaptime = this.formatTime(this.currentLap.sectors[2] - this.currentLap.start);
        this.player.hud.postMessage('timing', 'lastlap', lastLaptime);

        // Check if this is a new fastest lap
        let fastest = this.laps.filter(lap => !lap.penalty).length > 0
          ? this.laps.filter(lap => !lap.penalty).sort((a, b) => a.laptime - b.laptime)
          : [...this.laps].sort((a, b) => a.laptime - b.laptime);

        if (this.laps.length > 1 && this.currentLap.laptime === fastest[0].laptime) {
          
          // New fastest lap! 
          // update laptimer
          this.player.hud.postMessage('timing', 'bestlap', lastLaptime);
          // Team feedback
          setTimeout(() => {
            this.player.hud.postMessage('team', 'radio', `Fastest lap, babyyy!`, true);
          }, 1500);
          // Post race control announcement
          const announcement = `Fastest lap car ${this.player.carnumber} (${this.player.displayname.slice(0,3).toUpperCase()}) - ${lastLaptime}`;
          setTimeout(()=>{
            this.player.hud.postMessage('racecontrol', 'notice', announcement, true);
          }, 5000);
        }

        this.updateSessionLaptimes();

        //only start a new lap if there's time in the session left
        if(this.player.hud.sessionTime) {
          this.currentLap = {start: now, sectors: []};
        }
      }
    }

    if(!this.holdSectorTime) {
      // continuously update laptimer
      let time = ((new Date().getTime() - this.currentLap.start) / 1000).toFixed(1)
      this.player.hud.postMessage('timing', 'thislap', time);
    }

    if(this.timerInterval > 7500) {
      this.lapCounter.classList.remove('fastest');
      this.holdSectorTime = false;
      this.timerInterval = 0;
    }

    this.timerInterval += deltaTime;

  }

  isFastestSector(sectorIndex) {
    // Get current sector time
    let startTime = sectorIndex === 0 ? this.currentLap.start : this.currentLap.sectors[sectorIndex - 1];
    let currentSectorTime = this.currentLap.sectors[sectorIndex] - startTime;
    
    // Check against all previous laps
    return this.laps.every(lap => {
      if (lap.sectors.length > sectorIndex) {
        let lapStartTime = sectorIndex === 0 ? lap.start : lap.sectors[sectorIndex - 1];
        let lapSectorTime = lap.sectors[sectorIndex] - lapStartTime;
        return currentSectorTime < lapSectorTime;
      }
      return true;
    });
  }

  formatTime (milliseconds) {
    let mins = Math.floor((milliseconds * .001) / 60)
    let secs = ((milliseconds * .001) - mins  * 60).toFixed(3);
    if (secs < 10) secs = 0 + secs;
    return `${mins}:${secs}`;
  }

  updateSessionLaptimes () {
    let laptimesListMarkup = '';
    
    let fastest = [];
    if(this.laps.filter(lap => !lap.penalty).length) {
      fastest = this.laps.filter(lap => !lap.penalty).sort((a, b) => a.laptime - b.laptime);
    } else {
      fastest = [...this.laps].sort((a, b) => a.laptime - b.laptime);
    }

    this.laps.forEach(lap => {
    
    let element = 
    `
      <tr class="${lap.laptime == fastest[0].laptime ? 'fastest' : ''} ${lap.penalty ? lap.penalty  : ''}">
        <td><strong>${this.formatTime(lap.laptime)}<strong></td> 
        <td>${((lap.sectors[0] - lap.start) * .001 ).toFixed(3)}</td>
        <td>${((lap.sectors[1] - lap.sectors[0]) * .001 ).toFixed(3)}</td>
        <td>${((lap.sectors[2] - lap.sectors[1]) * .001 ).toFixed(3)}</td>
        <td><small>${lap.penalty ? lap.penalty  : ''}</small></span>
      </tr>
    `;
    laptimesListMarkup += element;
    });

    this.sessionTimes.tBodies[0].innerHTML = laptimesListMarkup;
  }
}