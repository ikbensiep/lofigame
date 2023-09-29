export default class Player {
  
  constructor(game) {

    this.game = game;
    this.element = window.player;
    this.carBody = this.element.querySelector('.car-body');
    
    this.width = 230;
    this.height = 120;

    this.waypoints = [
      {name:'garagebox', points: []},
      {name:'pitbox', points: []},
      {name:'pitlane', points: []},
      {name:'racetrack', points:  []}
    ];

    this.currentWaypoint = 0;

    // Car Physics
    this.velocity = 50
    this.displayVelocity= 0
    this.forceForward = 0
    this.forceBackward = 0
    this.facingAngle = -90
    this.isReversing = false
    this.isBraking = false
    this.baseForce = .66
    this.baseTurningSpeed = 3
    this.baseRoadAttrition = 0.99
    this.baseDirtAttrition = 0.8

    this.maxSpeedFront = 75
    this.maxSpeedBack = -3
    this.maxTurnSpeed = 1

    this.isOnRoad = true;
    
    this.hudWaypointsCollected = this.game.hud.querySelector('strong');
    this.hudWaypoints = this.game.hud.querySelector('span');

    this.pop = this.game.getExplosion();
    this.colliding = false;
    
    this.position = {x: 1920, y:1080}

    this.init()
  }

  init() {
    
    if(!this.game.scene) return false;
    waifupoints.innerHTML = '';

    // finding waypoints for all types of paths
    this.waypoints.map ( list => {
      this.findWaypoints( list.name )
    });

    // choose next waypoint
    
      this.findNextWayPoint(this.currentWaypoint);
    
    /*

    Mobile input (experimental LMAO)

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

  findWaypoints (pathType) {
    console.log(`finding ${pathType} points..`)

    let waypoints = []; 
    
    const path = iframe.contentDocument.documentElement.querySelector(`#${pathType}`);
    
    if (!path) { console.warn(pathType, "not found"); return false;}

    if (path.nodeName !== 'path') {
      
      waypoints.push({x: +path.getAttribute('cx'), y: +path.getAttribute('cy'), height: 16})
      
    } else {
      
      
      // FINDING WAYPOINT AT EVERY 2 CAR LENGTHS
      let stepSize = this.width * 2;
      
      const points = Math.floor(path.getTotalLength());

      for(let i=0; i<Math.floor(points / stepSize); i++) {
        let pathWaypoint = {
          x: path.getPointAtLength(i * stepSize).x,
          y: path.getPointAtLength(i * stepSize).y,
          height: 64
        }
        waypoints.push(pathWaypoint);
      }
    }

    // render active waypoints to screen
    const b = document.createElement('b');
    waypoints.map( (waypoint, index) => {
      let el = b.cloneNode();
      el.innerHTML = '&times;';
      el.className = `waypoint ${pathType}`;
      el.style.left = `${Math.round(waypoint.x )}px`;
      el.style.top = `${Math.round(waypoint.y )}px`;
      el.style.setProperty('--size', waypoint.height + 'px');
      
      waifupoints.appendChild(el);
      waypoints[index].element = el;
    });

    let currentWaypointType = this.waypoints.filter( waypoint => waypoint.name === pathType);
    
    currentWaypointType[0].points = waypoints;

  }

  findNextWayPoint() {
    
    if(this.waypoints[this.currentWaypoint] && this.waypoints[this.currentWaypoint].points.length) {
      
      this.position = {
        x: this.waypoints[this.currentWaypoint].points[0].x, 
        y: this.waypoints[this.currentWaypoint].points[0].y
      }
    } else {
      this.currentWaypoint++;
      console.log(this.currentWaypoint);
      // this.findNextWayPoint();
    }

    // let currentWaypoint = this.waypoints.filter (waypoint => waypoint.points.length > 0)[0];
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

  checkWaypoints () {
    // check waypoints
    let wphits = 0;
    
    this.waypoints[this.currentWaypoint].points.forEach(element => {

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

    
    window.debug.textContent = `Go to ${this.waypoints[this.currentWaypoint].name}`;
    this.hudWaypoints.textContent = this.waypoints[this.currentWaypoint].points.length;
    this.hudWaypointsCollected.textContent = wphits;

    if(wphits === this.waypoints[this.currentWaypoint].points.length) {
      if(this.currentWaypoint < this.waypoints.length - 1) {
        this.waypoints[this.currentWaypoint].completed = true;
        this.currentWaypoint++;
      } else {
        this.currentWaypoint = 0;
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
    this.displayVelocity = Math.abs(Math.round(this.velocity*15))
    
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
    this.carBody.dataset.velocity = Math.round(this.velocity);

    this.checkWaypoints()
    
    this.move()

  }

}