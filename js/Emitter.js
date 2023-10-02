export default class Emitter {
  constructor(game, img, width, height, maxFrame) {
    this.game = game;
    this.free = true;
    this.position= {x: 0, y: 0};
    this.speed = 0;
    this.image = img.cloneNode();
    this.width = width || 128;
    this.height = height || 128;
    this.image.width = this.width;
    this.image.height = this.height;
    this.frameY = 0
    this.frameX = 0;
    this.maxFrame = maxFrame || 64;
    this.animationTimer = 0;
    this.animationInterval = 1000/60;

    if (this.maxFrame == 1) {
      this.frameX = 1;
      this.frameY = 1;
    }

  }

  draw () {
    if(!this.free) {
      // sprite animation is handled by object-fit and object-position
      // the sprite sideways one step per animation frame
      
      // So as to not pollute the code, the calculation of object-position 
      // is handled in css (see .emitter-object @ style.css:142)
      this.image.style.setProperty('--step', this.frameX);
      this.image.style.setProperty('--row', this.frameY);
      this.image.style.setProperty('--spriteHeight', this.height)
      this.image.style.setProperty('--spriteWidth', this.height)
    }
  }

  update (deltaTime) {
    if(!this.free) {

      if(this.animationTimer > this.animationInterval) {
        
        this.frameX++;
        
        if(this.frameX % 8 == 0) {
          this.frameX = 0;
          this.frameY++;
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
    this.image.remove();
  }

  start (x, y, rot) {
    
    this.free = false;
    this.frameY = 0;
    this.frameX = 0;

    this.position.x = parseInt(x);
    this.position.y = parseInt(y);

    this.game.worldMap.appendChild(this.image);
    this.image.classList.add('emitter-object');

    this.image.style.setProperty('--left',`${this.position.x}px`);
    this.image.style.setProperty('--top',`${this.position.y}px`);
    this.image.style.setProperty('--rot',`${rot}deg`);
    this.image.id = '';
    
  }

}