import Emitter from './Emitter.js';

export default class Player {
  
  constructor(game) {

    this.game = game;
    this.element = window.player;
    this.carBody = this.element.querySelector('.car-body');
    
    this.width = 230;
    this.height = 120;
    
    this.position = {}
    this.cameraPosition = {}

    this.tireTrackPool = [];
    this.maxTireTracks = 200;
    this.createTireTracks();

    this.currentPath = 0;
    this.waypointsCompleted = false;
    this.paths = [
      {name:'garagebox', completed: false, points: []},
      {name:'pitbox', completed: false, points: []},
      {name:'pitlane', completed: false, points: []},
      {name:'racetrack', completed: false, points:  []}
    ];


    // Car Physics
    // move to config system (/ api?)
    this.velocity = 50
    this.displayVelocity= 0
    this.forceForward = 0
    this.forceBackward = 0
    this.facingAngle = 0
    
    this.baseForce = .50
    this.baseTurningSpeed = 1.5
    this.baseRoadAttrition = 0.99
    this.baseDirtAttrition = 0.8

    this.maxSpeedFront = 200
    this.maxSpeedBack = -3
    this.maxTurnSpeed = 3

    this.isOnRoad = true
    this.isReversing = false
    this.isBraking = false
    

    // fixme
    this.hudWaypoints = this.game.hud.querySelector('.points');
    this.hudWaypointsCollected = this.game.hud.querySelector('strong');
    this.hudWaypointsTotal = this.game.hud.querySelector('span');

    // emitter
    // (Explosion is a general purpose Emitter instance in the main game object)
    this.pop = this.game.getExplosion();
    this.colliding = false;


    

    this.init()
  }


  createTireTracks () {
  
    for(let i=0; i<this.maxTireTracks; i++) {
      this.tireTrackPool.push(new Emitter(this.game, window.rubberTrackSprite, 128, 93, 1));
    }
  }

  getTireTrack () {
    for(let i=0; i< this.tireTrackPool.length; i++) {
      if (this.tireTrackPool[i].free) {
        return this.tireTrackPool[i];
      }
    }
  }

  init() {
    

    if(!this.game.scene || this.game.scene == '') {
      console.log('no game scene selected!')
      return false;
    }
    
    waifupoints.innerHTML = '';
    this.allPathsCompleted = false;

    // finding waypoints for all types of paths
    this.paths.map ( path => {
      path.completed = false;
      this.findPathWaypoints( path.name )
    });

    // choose first path, find set of waypoints
    
    this.currentPath = 0;
    this.findNextWayPoint(this.currentPath);


    /* Mobile input (experimental LMAO)
    window.addEventListener("devicemotion", (event) => {
      window.debug.textContent = event.rotationRate.alpha.toFixed(2) || '0.00';
      
      // if(this.velocity != 0){
        if(this.velocity < this.maxSpeedFront){
          this.forceForward += this.baseForce / 20;
        }
        this.facingAngle += (event.rotationRate.alpha.toFixed(2) * .05) * this.baseTurningSpeed;
        
      // }
    });
    */

  }

  findPathWaypoints (pathType) {

    // Default waypoint distance: 5 car lengths
    let stepSize = this.width * 5;

    switch(pathType) {
      case 'garagebox':
        stepSize = 1000;
        break;
      case 'pitbox':
        stepSize = 100;
        break;
      case 'pitlane':
        break;
      case 'racetrack':
        stepSize = 3000;
        break;
    }

    let pathWaypoints = [];
    
    const path = iframe.contentDocument.documentElement.querySelector(`#${pathType}`);
    
    if (!path) { console.warn(pathType, "not found"); return false;}

    if (path.nodeName !== 'path') {
      
      pathWaypoints.push({x: +path.getAttribute('cx'), y: +path.getAttribute('cy'), height: 16})
      
    } else {
      

      const points = Math.floor(path.getTotalLength());

      for(let i=0; i<Math.floor(points / stepSize); i++) {

        // Collision detection calculates circles. 
        // 
        // Instead of supplying a `radius` to collidable entities
        // I'm using the `height` property which -probably-
        // will exist on most game entities.

        let pathWaypoint = {
          x: path.getPointAtLength(i * stepSize).x,
          y: path.getPointAtLength(i * stepSize).y,
          height: 64
        }
        pathWaypoints.push(pathWaypoint);
      }
    }

    // render pathWaypoints to screen
    const b = document.createElement('b');
    pathWaypoints.map( (waypoint, index) => {
      
      let el = b.cloneNode();
      el.innerHTML = '&times;';
      el.className = `waypoint ${pathType}`;
      
      el.style.left = `${Math.round(waypoint.x )}px`;
      el.style.top = `${Math.round(waypoint.y )}px`;
      el.style.setProperty('--size', waypoint.height + 'px'); //css uses --size variable to set width & height on waypoints
      
      // jaa lache
      waifupoints.appendChild(el);
      pathWaypoints[index].element = el;
    });

    let currentPath = this.paths.filter( waypoint => waypoint.name === pathType)[0];
    
    currentPath.points = pathWaypoints;

  }

  findNextWayPoint() {
  
    console.log(`path[${this.currentPath}]`, this.paths[this.currentPath].points.length);

    if(!this.paths[this.currentPath].completed && this.paths[this.currentPath].points.length) {
      
      this.position = {
        x: this.paths[this.currentPath].points[0].x, 
        y: this.paths[this.currentPath].points[0].y
      }

      this.cameraPosition = {...this.position};

    } else {
      this.currentPath++;
    }
  }

  // FIXME: bad function name
  checkPaths () {
    
    if(this.currentPath == undefined) {
      console.warn('no path', this.currentPath)
      return;
    }

    // check paths
    let wphits = 0;
    this.paths[this.currentPath].points.forEach(element => {

      if(element.element.classList.contains('hit')) {
        wphits++;
      }

      let bang = this.game.checkCollision(element, this);

      if (bang[0]) {
        element.element.classList.add('colliding')
        
        if(!element.element.classList.contains('hit')) {
          element.element.classList.add('hit')
          if (this.pop && this.pop.free && !this.colliding) { 
            this.pop.start(this.position.x, this.position.y, this.facingAngle );
          }
        }
        this.colliding = true;
      } else {
        element.element.classList.remove('colliding')
        this.colliding = false;
      }
    });


    window.debug.textContent = `Go to ${this.paths[this.currentPath].name}`;
    this.hudWaypointsTotal.textContent = this.paths[this.currentPath].points.length;
    this.hudWaypointsCollected.textContent = wphits;
    
    // all waypoints in current path are hit
    if(wphits === this.paths[this.currentPath].points.length) {

      this.paths[this.currentPath].completed = true;


      if(this.currentPath == this.paths.length - 1) {
        // ??
        this.currentPath = undefined;

      } else {
        this.currentPath++;
      }
    }
  }

  move () {

    if(this.velocity != 0){
        if(this.isOnRoad){
            this.forceForward *= this.baseRoadAttrition
            this.forceBackward *= this.baseRoadAttrition
        }
        else{
            this.forceForward *= this.baseDirtAttrition
            this.forceBackward *= this.baseDirtAttrition
        }
    }

    this.velocity = (this.forceForward - this.forceBackward).toFixed(3)
    this.position.x += this.velocity * Math.cos(this.facingAngle * Math.PI / 180);
    this.position.y += this.velocity * Math.sin(this.facingAngle * Math.PI / 180);
    this.displayVelocity = Math.abs(Math.round(this.velocity*3) )
    
    window.map.style.setProperty('--trans-origin', `${Math.floor(this.position.x)}px ${Math.floor(this.position.y)}px`);
    window.map.style.setProperty('--speed', (this.velocity / this.maxSpeedFront).toFixed(3));

    // in this case the container element #camera simply scrolls.
    // as in literal browser scrollbars.
    //
    // IDEA: experiment swapping this out and moving the .map child element
    // using translate3d()
    
    const cameraLerpSpeed = 0.8;
    const cameraTargetX = this.position.x;
    const cameraTargetY = this.position.y;
    
    this.cameraPosition.x = this.game.lerp (this.cameraPosition.x, cameraTargetX, cameraLerpSpeed);
    this.cameraPosition.y = this.game.lerp (this.cameraPosition.y, cameraTargetY, cameraLerpSpeed);

    this.game.camera.scrollTo(
      parseInt((this.cameraPosition.x) - window.innerWidth / 2), 
      parseInt((this.cameraPosition.y) - window.innerHeight / 2)
    )
    
    this.element.style.setProperty('--x', parseInt(this.position.x));
    this.element.style.setProperty('--y', parseInt(this.position.y));
    this.element.style.setProperty('--angle', `${this.facingAngle}deg`)
    
    this.isBraking ? this.element.classList.add('braking') : this.element.classList.remove('braking');



    // Just some dumb helicopter stuff
    let heli = window.helicopter;
    let cx = parseInt(heli.style.left);
    let cy = parseInt(heli.style.top);
    let dx = parseInt(this.position.x - cx) * .5;
    let dy = parseInt(this.position.y - cy) * .5;

    const distance = parseInt(Math.hypot(dx, dy));
    // const angleRads = Math.atan2(dy, dx);
    const angleDegs = Math.atan2(dy, dx) * 180 / Math.PI;

    const volume = (100 - ( Math.abs(distance) / 100)) / 100 ;
    
    if( volume < 1 && volume > 0) {
      heli.querySelector('audio').volume = volume.toFixed(1);
    } else {
      // instead of play/pausing and potentially hear a little clipping everytime an audo
      // stream is started, just play at very low volume.
      heli.querySelector('audio').volume = 0.05;
    }
    
    heli.style.setProperty('--x', (cx + dx));
    heli.style.setProperty('--y', (cy + dy));
    heli.style.setProperty('--rot', angleDegs);

  }

  honk () {
    this.carBody.querySelector('audio.horn').play()
  }

  update (input, deltaTime) {
    // handle button input
    if(input) {
      
      let mod = this.isReversing ? -1 : 1; 
      
      // player input handling
      if(input.includes("ArrowRight")){
        if(this.velocity != 0){
            this.facingAngle += this.baseTurningSpeed * mod
          }
      }
          
      if(input.includes("ArrowLeft")){
          if(this.velocity != 0){
              this.facingAngle -= this.baseTurningSpeed * mod
          }
      }

      if(input.includes("ArrowUp") || input.includes('a')){
          if(this.velocity < this.maxSpeedFront){
              this.forceForward += this.baseForce;
              this.isReversing = false;
          }
      }

      if(input.includes("ArrowDown") || input.includes("z") ){
        
        if(this.velocity > 0) {
          this.isBraking = true;
          this.isReversing = false;
        } else {
          this.isBraking = false;
          this.isReversing = true;
        }

        if(this.velocity > this.maxSpeedBack){
          this.forceBackward += this.baseForce;
        }
        
        if (this.isBraking && this.velocity > this.maxSpeedFront * .75 ) {
          // use deltaTime to periodically drop / clear up old tire tracks?
          // current limit is 2000 (which will not suffice and eventually 
          // `tiretrack` will become undefined because this code will 
          // exceed tireTrackPool size.
          let tiretrack = this.getTireTrack();
          tiretrack.start(this.position.x, this.position.y, this.facingAngle );
        }

      } else {
        this.isBraking = false;
      }

      // player honking
      if(input.includes("Shift") || input.includes("CapsLock") ){
        this.honk();
      }
    }

    // display velocity on car element
    this.carBody.dataset.velocity = this.displayVelocity;

    if (!this.allPathsCompleted) { 

      if(this.paths[this.paths.length - 1].completed) {
        this.allPathsCompleted = true;
        if(this.allPathsCompleted) {
          window.debug.textContent = `All done! Have fun :)`;
          window.waifupoints.innerHTML = '';
          this.honk()
        }
      } 
      if(this.currentPath !== undefined ) {
          this.checkPaths();
      }
    }

    this.move()

  }

}