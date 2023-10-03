// Vector class for basic vector operations
export default class Vector {
  constructor(x, y) {
      this.x = x;
      this.y = y;
  }

  static dotProduct(v1, v2) {
      return v1.x * v2.x + v1.y * v2.y;
  }

  static normalize(vector) {
      const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
      return new Vector(vector.x / magnitude, vector.y / magnitude);
  }
}