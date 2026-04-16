/**
 * Ray-casting algorithm to check if a point is inside a polygon
 * @param {Array} point [lng, lat]
 * @param {Array} polygon [[lng, lat], [lng, lat], ...]
 * @returns {Boolean}
 */
const isPointInPolygon = (point, polygon) => {
  const x = point[0];
  const y = point[1];
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    
    if (intersect) inside = !inside;
  }

  return inside;
};

/**
 * Parses polygon string from env to array
 * @param {String} polygonStr e.g. "[[73,18],[74,18],...]"
 * @returns {Array}
 */
const parsePolygon = (polygonStr) => {
  try {
    return JSON.parse(polygonStr);
  } catch (err) {
    console.error("Failed to parse CAMPUS_POLYGON_COORDS", err);
    return [];
  }
};

module.exports = { isPointInPolygon, parsePolygon };
