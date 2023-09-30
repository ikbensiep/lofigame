export default class Player {
  
  constructor(game) {

    this.game = game;
    this.element = window.player;
    this.carBody = this.element.querySelector('.car-body');
    
    this.width = 230;
    this.height = 120;

    this.paths = [
      {name:'garagebox', completed: false, points: []},
      {name:'pitbox', completed: false, points: []},
      {name:'pitlane', completed: false, points: []},
      {name:'racetrack', completed: false, points:  []}
    ];

    this.currentPath = 0;
    this.waypointsCompleted = false;

    // Car Physics
    this.velocity = 50
    this.displayVelocity= 0
    this.forceForward = 0
    this.forceBackward = 0
    this.facingAngle = 0
    this.isReversing = false
    this.isBraking = false
    this.baseForce = .50
    this.baseTurningSpeed = 2
    this.baseRoadAttrition = 0.99
    this.baseDirtAttrition = 0.8

    this.maxSpeedFront = 75
    this.maxSpeedBack = -3
    this.maxTurnSpeed = 1

    this.isOnRoad = true;
    
    this.hudWaypoints = this.game.hud.querySelector('.points');
    this.hudWaypointsCollected = this.game.hud.querySelector('strong');
    this.hudWaypointsTotal = this.game.hud.querySelector('span');
    

    this.pop = this.game.getExplosion();
    this.colliding = false;
    
    this.position = {x: 1920, y:1080}

    this.init()
  }

  init() {
    
    if(!this.game.scene) {
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

    // choose next waypoint
    this.currentPath = 0;
    this.findNextWayPoint(this.currentPath);
    console.log(this.paths)
    

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
        let pathWaypoint = {
          x: path.getPointAtLength(i * stepSize).x,
          y: path.getPointAtLength(i * stepSize).y,
          height: 64
        }
        pathWaypoints.push(pathWaypoint);
      }
    }

    // render active pathWaypoints to screen
    const b = document.createElement('b');
    pathWaypoints.map( (waypoint, index) => {
      let el = b.cloneNode();
      el.innerHTML = '&times;';
      el.className = `waypoint ${pathType}`;
      el.style.left = `${Math.round(waypoint.x )}px`;
      el.style.top = `${Math.round(waypoint.y )}px`;
      el.style.setProperty('--size', waypoint.height + 'px');
      
      waifupoints.appendChild(el);
      pathWaypoints[index].element = el;
    });

    let currentPath = this.paths.filter( waypoint => waypoint.name === pathType)[0];
    
    currentPath.points = pathWaypoints;

  }

  findNextWayPoint() {
  
    console.log('current path:', this.paths[this.currentPath]);

    if(!this.paths[this.currentPath].completed && this.paths[this.currentPath].points.length) {
      
      this.position = {
        x: this.paths[this.currentPath].points[0].x, 
        y: this.paths[this.currentPath].points[0].y
      }

    } else {
      this.currentPath++;
    }
    

    // let currentWaypoint = this.paths.filter (waypoint => waypoint.points.length > 0)[0];
    // if (!currentWaypoint) {
    //   console.error('hu')
    //   this.position = {x: 0, y: 0};
    // } else {
    //   // init player on the first avialable waypoint
    //   this.position = {
    //     x: currentWaypoint.points[0].x, 
    //     y: currentWaypoint.points[0].y
    //   }
    // }

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
    
    this.game.camera.scrollTo((this.position.x) - window.innerWidth / 2, (this.position.y) - window.innerHeight / 2)
    
    this.element.style.setProperty('--angle', `${this.facingAngle}deg`)
    
    this.isBraking ? this.element.classList.add('braking') : this.element.classList.remove('braking');
  }

  honk () {
    this.carBody.querySelector('audio.horn').play()
  }


  update (input) {
    // handle button input
    if(input) {

      // player honking
      if(input.includes("Shift") || input.includes("CapsLock") ){
        this.honk();
      }

      // player input handling
      if(input.includes("ArrowRight")){
        if(this.velocity != 0){
            this.facingAngle += this.baseTurningSpeed
          }
      }
          
      if(input.includes("ArrowLeft")){
          if(this.velocity != 0){
              this.facingAngle -= this.baseTurningSpeed
          }
      }

      if(input.includes("ArrowUp") || input.includes('a')){
          if(this.velocity < this.maxSpeedFront){
              this.forceForward += this.baseForce;
          }
      }

      if(input.includes("ArrowDown") || input.includes("z") ){
        
        if(this.velocity > 0) {
          this.isBraking = true;
        } else {
          this.isBraking = false;
        }

        if(this.velocity > this.maxSpeedBack){
          this.forceBackward += this.baseForce;
        }
        
      } else {
        this.isBraking = false;
      }
    }

    // display velocity on car element
    this.carBody.dataset.velocity = this.displayVelocity;

    if (!this.allPathsCompleted) { 

      if(this.paths[this.paths.length - 1].completed) {
        this.allPathsCompleted = true;
        if(this.allPathsCompleted) {
          window.debug.textContent = `Have fun.`;
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