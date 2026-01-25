// @ts-check
/**
 * Camera class for managing camera follow behavior
 * Handles both vehicle (car) and character (walking) camera logic
 * Designed to be reusable for any entity (car, character, helicopter, etc.)
 */
export default class Camera {
  constructor(game, lerpSpeed = 0.15, lookAhead = 300) {
    this.game = game;
    this.position = { x: 0, y: 0 };
    this.lerpSpeed = lerpSpeed;
    this.lookAhead = lookAhead;
    this.zoom = 0.25;
    this.target = null; // The entity being followed
    this.element = game.gameCamera.element;
  }

  /**
   * Set the target entity for the camera to follow
   * @param {Object} target - Entity with position, facingAngle, velocity properties
   */
  setTarget(target) {
    this.target = target;
  }

  /**
   * Update camera position based on target
   * For cars: look ahead in direction of travel based on velocity
   * For characters: tighter follow with minimal lookahead
   */
  update() {
    if (!this.target) return;

    const isCharacter = this.target.maxSpeed && this.target.maxSpeed <= 5;
    
    let cameraTargetX, cameraTargetY;

    if (isCharacter) {
      // For walking: simple follow, slight offset in facing direction
      const offset = this.game.sidesFromHypotenhuse(100, this.target.facingAngle);
      cameraTargetX = this.target.position.x + (offset.width * 0.3);
      cameraTargetY = this.target.position.y + (offset.height * 0.3);
      this.zoom = 0.25;
    } else {
      // For cars: look ahead based on velocity
      const offset = this.game.sidesFromHypotenhuse(this.lookAhead, this.target.facingAngle);
      cameraTargetX = this.target.position.x + (offset.width * (this.target.velocity / 200));
      cameraTargetY = this.target.position.y + (offset.height * (this.target.velocity / 200));
      
      const zoomfactor = (this.target.velocity / (this.target.maxSpeedFront || 200));
      this.zoom = isNaN(zoomfactor) || !isFinite(zoomfactor) ? 0.25 : zoomfactor;
    }

    // Lerp camera smoothly
    this.position.x = this.game.lerp(this.position.x, cameraTargetX, this.lerpSpeed);
    this.position.y = this.game.lerp(this.position.y, cameraTargetY, this.lerpSpeed);

    this.render();
  }

  /**
   * Apply camera transformations to DOM
   */
  render() {
    if (!this.target) return;

    const transorigin = `${Math.floor(this.target.position.x)}px ${Math.floor(this.target.position.y)}px`;
    const translate = `${Math.floor((this.position.x - this.game.windowSize.innerWidth / 2) * -1)}px ${Math.floor((this.position.y - this.game.windowSize.innerHeight / 2) * -1)}px`;

    this.element.style.setProperty('--zoom', this.zoom.toFixed(3));
    this.element.style.setProperty('--translate', translate);
    this.element.style.setProperty('--trans-origin', transorigin);
    this.element.style.setProperty('--x', Math.round(this.target.position.x));
    this.element.style.setProperty('--y', Math.round(this.target.position.y));
    this.element.style.setProperty('--angle', Math.round(this.target.facingAngle));

    // Set car-specific variables only when driving (freeze them when walking)
    if (this.target.mode === 'driving' && this.target.carPosition) {
      this.element.style.setProperty('--car-x', Math.round(this.target.position.x));
      this.element.style.setProperty('--car-y', Math.round(this.target.position.y));
      this.element.style.setProperty('--car-angle', Math.round(this.target.facingAngle));
    }
  }
}
