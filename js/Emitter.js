export default class Emitter {
  constructor(game, elem, width, height, maxFrame, sticky) {
    this.game = game;
    this.free = true;
    this.position= {x: 0, y: 0};
    this.speed = 0;
    this.sprite = elem.cloneNode(true);
    this.sprite.id = ''; //making sure we don't copy over the id from the cloned sprite element
    this.width = width || 128;
    this.height = height || 128;
    this.rotation = 0;
    this.sprite.style.width = this.width + "px";
    this.sprite.style.height = this.height + "px";
    this.frameX = 0;
    this.frameY = 0;
    this.frame = 0;
    this.maxFrame = maxFrame || 64;
    this.animationTimer = 0;
    this.animationInterval = 1000/12;
    this.opacity = 100;
    this.fadeOutTimer = undefined;
    this.sticky = sticky;
    this.img = this.sprite.querySelector('img');

    this.framesPerRow = Math.floor(this.img.width / this.width);

    if (this.maxFrame == 1) {
      this.frameX = 1;
      this.frameY = 1;
    }
    this.sprite.style.setProperty('--spriteHeight', this.height);
    this.sprite.style.setProperty('--spriteWidth', this.width);
    // console.info('constructor', this.img.width, this.width)
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
      let offset = {height: 0, width: 0};

      if(this.sticky) {
        offset = this.game.sidesFromHypotenhuse(this.game.player.width / 2, this.game.player.facingAngle)
        this.position.x = this.game.player.position.x - offset.width;
        this.position.y = this.game.player.position.y - offset.height;
      }
      
      this.sprite.style.setProperty('--left',`${this.position.x}px`);
      this.sprite.style.setProperty('--top',`${this.position.y}px`);
      this.sprite.style.setProperty('--rot',`${this.rotation}deg`);

      if(this.animationTimer > this.animationInterval) {
        if(this.frame < this.maxFrame) {
          this.frame++;
        } else {
          this.frame = 0;
          this.reset();
        }

        this.frameX = this.frame % this.framesPerRow;
        this.frameY = Math.floor(this.frame / this.framesPerRow);

        this.animationTimer = 0;
        this.draw()
        
      } else {
        this.animationTimer += deltaTime;
      }


    }
  }

  reset () {
    this.sprite.remove();
    this.free = true;
    this.opacity = 100;
  }

  fadeOut (fadeInterval) {

    this.fadeOutTimer = setInterval(() => {
      this.opacity--;
      this.sprite.style.opacity = this.opacity / 100;
      if( this.opacity <= 0.1) {
        this.reset();
        clearInterval(this.fadeOutTimer);
      }
    }, fadeInterval || 1000)
  }

  start (x, y, rot) {

    // console.log('frames / row:',this.framesPerRow);
    // console.log('img width:', this.img.width, 'this.width:', this.width)

    this.free = false;
    this.frameY = 0;
    this.frameX = 0;
    this.position.x = x;
    this.position.y = y;
    
    this.sprite.classList.add('emitter-object');
    this.game.worldMap.querySelector('.track').appendChild(this.sprite);
    

    this.sprite.style.setProperty('--left',`${this.position.x}px`);
    this.sprite.style.setProperty('--top',`${this.position.y}px`);
    this.sprite.style.setProperty('--rot',`${rot}deg`);
    this.sprite.style.opacity = this.opacity;
  }

}