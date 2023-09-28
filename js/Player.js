export default class Player {
  
  constructor(game) {

    this.game = game;
    this.element = window.player;
    this.width = 230;
    this.height = 120;

    this.waypoints = {
      'pitlane': [],
      'garage': null,
      'racetrack': []
    };

    // Car Physics
    this.velocity = 0
    this.displayVelocity= 0
    this.forceForward = 0
    this.forceBackward = 0
    this.facingAngle = 0
    this.isReversing = false
    this.isBraking = false
    this.baseForce = .66
    this.baseTurningSpeed = 3
    this.baseRoadAttrition = 0.99
    this.baseDirtAttrition = 0.8

    this.maxSpeedFront = 150000
    this.maxSpeedBack = -3
    this.maxTurnSpeed = 1

    this.isOnRoad = true;
    
    this.hudWaypointsCollected = this.game.hud.querySelector('strong');
    this.hudWaypoints = this.game.hud.querySelector('span');

    this.position = {x: 0, y:0}

    this.init()
  }

  init() {
    
    if(!this.game.scene) return false;
    waifupoints.innerHTML = '';
    this.findWaypoints('racetrack');
    this.findWaypoints('pitlane');

    // somewhere halfway the pitlane..
    this.position = {
      x: this.waypoints['pitlane'][10].x, 
      y: this.waypoints['pitlane'][10].y
    }
  }

  findWaypoints (pathtype) {

    let waypoints = this.waypoints[pathtype];
    waypoints.length = 0;
    

    const path = iframe.contentDocument.documentElement.querySelector(`#${pathtype}`);
    
    console.log({pathtype, iframe})

    const points = Math.floor(path.getTotalLength());

    // FINDING WAYPOINT AT EVERY 2 CAR LENGTHS
    let stepSize = this.width * 2;

    for(let i=0; i<Math.floor(points / stepSize); i++) {
      let pathWaypoint = {
        x: path.getPointAtLength(i * stepSize).x,
        y: path.getPointAtLength(i * stepSize).y,
        height: 64
      }
      waypoints.push(pathWaypoint);
    }

    const b = document.createElement('b');
    
    waypoints.map( (waypoint, index) => {
      
      let el = b.cloneNode();
      el.innerHTML = '&times;';
      el.className = `waypoint ${pathtype}`;
      el.style.left = `${Math.round(waypoint.x )}px`;
      el.style.top = `${Math.round(waypoint.y )}px`;
      el.style.setProperty('--size', waypoint.height + 'px');
      
      waifupoints.appendChild(el);
      waypoints[index].element = el;
    });
    
    this.waypoints[pathtype] = waypoints;

    this.hudWaypoints.textContent = this.waypoints['racetrack'].length;
  }

  findNextWayPoint() {
    // todo
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

  update (input) {
    
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

    // check waypoints
    let wphits = 0;
    this.waypoints['racetrack'].forEach(element => {
      
      if(element.element.classList.contains('hit')) {
        wphits++;
      }

      let bang = this.game.checkCollision(element, this)
      if (bang) {
        element.element.classList.add('colliding')
        element.element.classList.add('hit')
      } else {
        element.element.classList.remove('colliding')
      }
    });

    this.hudWaypointsCollected.textContent = wphits;



    // display velocity on car element
    this.element.dataset.velocity = Math.round(this.velocity);

    
    this.move()

  }

}