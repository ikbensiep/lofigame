export default class Emitter {
  constructor(game, img) {
    this.game = game;
    this.free = true;
    this.position= {x: 0, y: 0};
    this.speed = 0;
    this.image = img.cloneNode();
    this.width = 128;
    this.height = 128;
    this.frameY = 0
    this.frameX = 0;
    this.maxFrame = 64;
    this.animationTimer = 0;
    this.animationInterval = 1000/500;

  }

  draw () {
    if(!this.free) {
      
    }
  }

  update (deltaTime) {
    if(!this.free) {

      if(this.animationTimer > this.animationInterval) {
        
        this.frameX++;
        
        // sprite animation is handled by object-fit and object-position
        // the sprite sideways one step per animation frame
        
        // So as to not pollute the code, the calculation of object-position 
        // is handled in css (see .emitter-object @ style.css:142)
        this.image.style.setProperty('--step', this.frameX);
        this.image.style.setProperty('--row', this.frameY);

        if(this.frameX * this.frameY > this.maxFrame) {
          this.reset();
        }
        this.animationTimer = 0;
      } else {

        this.animationTimer += deltaTime;
        
        if(this.frameX % 8 == 0) {
          this.frameY++;
        }
      }
    }
  }

  reset () {
    this.free = true;
  }

  start (x, y, rot) {
    
    this.free = false;
    this.position.x = Math.round(x);
    this.position.y = Math.round(y);
    this.frameY = 0;

    this.game.map.appendChild(this.image);
    this.image.classList.add('emitter-object');
    this.image.style.height = this.height + 'px';
    this.image.style.width = this.width + 'px';
    this.image.style.setProperty('--left',`${x}px`);
    this.image.style.setProperty('--top',`${y}px`);
    this.image.style.setProperty('--rot',`${rot}deg`);
    this.image.id = '';
    
  }

}