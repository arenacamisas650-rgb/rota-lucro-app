// Fórmula de Haversine para distância entre duas coordenadas em km
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distância em km
};

// Distância perpendicular de um ponto a uma linha segmentada
const getPerpendicularDistance = (point, lineStart, lineEnd) => {
  const x = point.lng;
  const y = point.lat;
  const x1 = lineStart.lng;
  const y1 = lineStart.lat;
  const x2 = lineEnd.lng;
  const y2 = lineEnd.lat;

  const num = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1);
  const den = Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));

  return den === 0 ? calculateDistance(y, x, y1, x1) : num / den;
};

// Algoritmo de Douglas-Peucker para simplificação de coordenadas
// points: [{ lat, lng, timestamp }]
// epsilon: tolerância máxima de distância para simplificação (e.g. 0.0001)
export const simplifyRoute = (points, epsilon = 0.0001) => {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const distance = getPerpendicularDistance(points[i], points[0], points[end]);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  if (maxDistance > epsilon) {
    // Recursão
    const results1 = simplifyRoute(points.slice(0, index + 1), epsilon);
    const results2 = simplifyRoute(points.slice(index), epsilon);

    // Junta os dois descartando o ponto repetido no meio
    return results1.slice(0, results1.length - 1).concat(results2);
  }

  return [points[0], points[end]];
};
