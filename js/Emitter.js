export default class Emitter {
  constructor(game, elem, width, height, maxFrame, sticky, targetLayer, loop = false) {
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
    this.loop = loop;
    this.animationTimer = 0;
    this.animationInterval = 1000/24;
    this.opacity = 100;
    this.fadeOutTimer = undefined;
    this.sticky = sticky;
    this.targetLayer = targetLayer ? targetLayer : this.game.worldMap.querySelector('.track')
    this.img = this.sprite.querySelector('img');
    this.img.addEventListener('load', (e) => {
      let path = new URL(e.target.src);
      let file = path.pathname;
      
      // console.log(`🖼️ loaded ${file}, w: ${this.img.width || e.target.width}, framesPerRow: ${this.framesPerRow}`)
      this.framesPerRow = Math.floor(e.target.width / this.width);
    })

    this.framesPerRow = Math.floor(this.img.width / this.width);

    if (this.maxFrame == 1) {
      this.frameX = 0;
      this.frameY = 0;
    }

    this.sprite.style.setProperty('--spriteHeight', this.height.toFixed(2));
    this.sprite.style.setProperty('--spriteWidth', this.width.toFixed(2));
  }

  draw () {
    if(!this.free) {
      // sprite animation is handled by changing the CSS `object-position` using a css variable
      // (see `.emitter-object` @ style.css:142)
      this.sprite.style.setProperty('--step', this.frameX);
      this.sprite.style.setProperty('--row', this.frameY);
    }
  }

  update (deltaTime) {
    if(!this.free) {
      if(this.sticky) {
        let offset = this.game.sidesFromHypotenhuse(this.game.player.width / 2, this.game.player.facingAngle)
        this.position.x = parseInt(this.game.player.position.x - offset.width);
        this.position.y = parseInt(this.game.player.position.y - offset.height);

        let left, top, rot;
        left = parseInt(this.position.x);
        top = parseInt(this.position.y);
        rot = parseInt(this.rotation);

        this.sprite.style.setProperty('--left',`${left}px`);
        this.sprite.style.setProperty('--top',`${top}px`);
        this.sprite.style.setProperty('--rot',`${rot}deg`);

      }

      if(this.animationTimer > this.animationInterval) {
        if(this.frame < this.maxFrame) {
          this.frame++;
        } else {
          if(!this.loop) {
            this.reset();
          } else {
            this.frame = 0;
            this.frameY = 0;
            this.frameX = 0;
          }
        }

        this.frameX = this.frame % this.framesPerRow;
        this.frameY = Math.floor(this.frame / this.framesPerRow);

        // Halp
        if(isNaN(this.frameX) || !isFinite(this.frameX)) this.frameX = 0;
        if(isNaN(this.frameY) || !isFinite(this.frameY)) this.frameY = 0;

        this.animationTimer = 0;
        this.draw()
        
      } else {
        this.animationTimer += deltaTime;
      }


    }
  }

  reset () {
    this.sprite.remove();
    this.frame = 0;
    this.frameX = 0;
    this.frameY = 0;
    this.free = true;
    this.opacity = 100;
  }

  fadeOut (fadeInterval) {

    this.fadeOutTimer = setInterval(() => {
      this.opacity--;
      this.sprite.style.opacity = (this.opacity / 100).toFixed(2);
      if( this.opacity <= 0.1) {
        this.reset();
        clearInterval(this.fadeOutTimer);
      }
    }, fadeInterval || 1000)
  }

  start (x, y, rot) {
    this.rotation = rot;

    this.free = false;
    this.frame = 0;
    this.frameY = 0;
    this.frameX = 0;
    this.position.x = x;
    this.position.y = y;
    
    this.sprite.classList.add('emitter-object');
    this.targetLayer.appendChild(this.sprite);

    this.sprite.style.setProperty('--left',`${parseInt(this.position.x)}px`);
    this.sprite.style.setProperty('--top',`${parseInt(this.position.y)}px`);
    this.sprite.style.setProperty('--rot',`${parseInt(rot)}deg`);
    this.sprite.style.opacity = this.opacity / 100;
  }

}