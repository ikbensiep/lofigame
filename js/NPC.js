import Emitter from "./Emitter.js";

export default class NPC {
  
  constructor(game, spriteElem, svgPathElem, targetLayer,  marshalId, radius = 64, maxFrames = 64) {
    this.game = game;
    this.sprite = new Emitter(game, spriteElem, radius, radius, maxFrames, false, targetLayer, false );
    this.sprite.sprite.id = `${svgPathElem.id}-marshal-${marshalId}`;
    this.base = svgPathElem;
    this.position = {x: 0, y: 0};
    this.target = {x: this.base.cx.baseVal.value, y: this.base.cy.baseVal.value};
    this.radius = radius;
    this.speed = .2 + Math.random() * .8;
    this.status = 'idle';
    this.facingAngle = Math.random()* 360;
    this.marshalId = marshalId;
  }

  init () {
    let x = this.base.cx.baseVal.value + (Math.random() * this.radius - (this.radius * .5));
    let y = this.base.cy.baseVal.value + (Math.random() * this.radius - (this.radius * .5));
    this.position = {x, y};
    this.sprite.loop = true;
    this.sprite.start(this.position.x, this.position.y, this.facingAngle);
  }

  rescue () {

    /* 
    * set NPC target to player
    */
   
    let player = this.game.player;
    let cx = parseInt(this.position.x);
    let cy = parseInt(this.position.y);
    this.target.x = parseInt(player.position.x - cx);
    this.target.y = parseInt(player.position.y - cy);
    this.free = false;
  }

  draw () {
      this.sprite.sprite.style.setProperty('--left', Math.floor(this.position.x) + 'px');
      this.sprite.sprite.style.setProperty('--top', Math.floor(this.position.y) + 'px');
      this.sprite.sprite.style.setProperty('--rot', Math.floor(this.facingAngle + 90) + 'deg');
  }

  update (deltaTime) {
    
    if (this.status === 'dead' || this.game.getDistance(this, this.game.player) > window.innerWidth) {
      return;
    }


    if(this.status === 'rescue' && this.game.player.hud.sessionTime) {
      this.rescue();
    } else {
      this.target.x = this.base.cx.baseVal.value - this.position.x;
      this.target.y = this.base.cy.baseVal.value - this.position.y;
    }
    
    // colliding with Player
    let [playerCollision, distance, sumOfRadii, distanceX, distanceY] = this.game.checkCollision(this, this.game.player);

    if (playerCollision) {

      this.sprite.img.classList.add('hit');

      const unitX = distanceX / distance;
      const unitY = distanceY / distance;

      this.position.x = this.game.player.position.x + (sumOfRadii + this.game.player.velocity) * unitX;
      this.position.y = this.game.player.position.y + (sumOfRadii + this.game.player.velocity) * unitY;
      
      this.game.player.hud.postMessage('racecontrol','notice',`Incident involving car number ${this.game.player.carnumber} and marshal ${this.marshalId}`, true);
      this.game.player.hud.postMessage('team','radio','DON\'T HIT THE MARSHALS!', true);
      
      if(this.game.player.velocity > 40) {
        this.status = 'dead';
        this.sprite.img.classList.add(this.status);
        this.game.player.hud.postMessage('session', 'status','red flag');

        this.game.player.hud.sessionTime = 0;

      }
    } else {
      this.sprite.img.classList.remove('hit');
    }
 
    // colliding with other NPC
    this.game.marshals.forEach(lilguy => {
      if(lilguy.marshalId == this.marshalId) return;
      
      let [collision, distance, sumOfRadii, distanceX, distanceY] = this.game.checkCollision(this, lilguy);
      if (collision) {
        
        // these values will always be 0-1 as the distance = hypotenuse
        // ie a fraction of the total length. May be netgative, so a 
        // value between -1 and and +1
        const unitX = distanceX / distance;
        const unitY = distanceY / distance;
        
        this.position.x = lilguy.position.x + (sumOfRadii + 3) * unitX;
        this.position.y = lilguy.position.y + (sumOfRadii + 3) * unitY;
      }
    });

    // If walking, animate NPC sprite
    if (Math.abs(this.target.x) > this.radius * 1.5 || Math.abs(this.target.y) > this.radius * 1.5 && !playerCollision) {

      // animate NPC
      this.sprite.update(deltaTime);

      // move NPC
      this.position.x += ((this.target.x * .025) + (Math.sin(deltaTime) * 2)) * this.speed;
      this.position.y += ((this.target.y * .025) + (Math.sin(deltaTime) * 2)) * this.speed;
      this.facingAngle = Math.atan2(this.target.y, this.target.x) * 180 / Math.PI;
      this.draw();

    } else {
      this.free = true;
    }
  }
}