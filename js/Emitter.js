export default class Emitter {
  constructor(game, elem, width, height, maxFrame, sticky) {
    this.game = game;
    this.free = true;
    this.position= {x: 0, y: 0};
    this.speed = 0;
    this.sprite = elem.cloneNode(true);
    this.width = width || 128;
    this.height = height || 128;
    this.sprite.style.width = this.width + "px";
    this.sprite.style.height = this.height + "px";
    this.frameX = 0;
    this.frameY = 0
    this.maxFrame = maxFrame || 64;
    this.animationTimer = 0;
    this.animationInterval = 1000/100;
    this.opacity = 100;
    this.fadeOutTimer = undefined;
    this.sticky = sticky;

    this.framesPerRow = Math.floor(this.sprite.querySelector('img').width / this.width);

    if (this.maxFrame == 1) {
      this.frameX = 1;
      this.frameY = 1;
    }
    this.sprite.style.setProperty('--spriteHeight', this.height)
    this.sprite.style.setProperty('--spriteWidth', this.width)
  }

  draw () {
    if(!this.free) {
      // sprite animation is handled by object-fit and object-position
      // the sprite sideways one step per animation frame
      
      // So as to not pollute the code, the calculation of object-position 
      // is handled in css (see .emitter-object @ style.css:142)
      this.sprite.style.setProperty('--step', this.frameX);
      this.sprite.style.setProperty('--row', this.frameY);
      
    }
  }

  update (deltaTime) {
    if(!this.free) {
      
      if(this.sticky) {
        let offset = this.game.sidesFromHypotenhuse(this.game.player.width / 2, this.game.player.facingAngle)
        this.position.x = this.game.player.position.x - offset.width;
        this.position.y = this.game.player.position.y - offset.height;
        
        this.sprite.style.setProperty('--left',`${this.position.x}px`);
        this.sprite.style.setProperty('--top',`${this.position.y}px`);
        this.sprite.style.setProperty('--rot',`${this.game.player.facingAngle}deg`);
      }

      if(this.animationTimer > this.animationInterval) {
        
        this.frameX++;
        
        if(this.frameX % this.framesPerRow == 0) {
          this.frameX = 0;
          this.frameY++;
        }

        if(this.frameY * this.height > this.height) {
          this.frameY = 0;
        } else {
          this.frameY++
        }

        if(this.frameX * this.frameY > this.maxFrame) {
          this.reset();
        }

        this.draw()

        this.animationTimer = 0;
      } else {
        this.animationTimer += deltaTime;
      }


    }
  }

  reset () {
    this.free = true;
    this.sprite.remove();
  }

  fadeOut () {

    this.fadeOutTimer = setInterval(() => {
      this.opacity--;
      this.sprite.style.opacity = this.opacity / 100;
      if( this.opacity <= 0.1) {
        this.reset();
        clearInterval(this.fadeOutTimer);
      }
    }, 1000)
  }

  start (x, y, rot) {
    
    this.free = false;
    this.frameY = 0;
    this.frameX = 0;
    this.opacity = 100;
    this.position.x = x;
    this.position.y = y;

    console.log(`Emitter: ${this.sprite.className}`, x,y)

    this.game.worldMap.querySelector('.track').appendChild(this.sprite);
    this.sprite.classList.add('emitter-object');

    this.sprite.style.setProperty('--left',`${this.position.x}px`);
    this.sprite.style.setProperty('--top',`${this.position.y}px`);
    this.sprite.style.setProperty('--rot',`${rot}deg`);
    this.sprite.id = ''; //?
    
  }

}