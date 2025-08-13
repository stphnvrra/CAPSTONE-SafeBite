import { selectCrimeSafeRoute, computeRouteExposure, LineString, Polygon } from '../src/lib/crime';

const line = (coords: number[][]): LineString => ({ type: 'LineString', coordinates: coords as any });
const poly = (coords: number[][][]): Polygon => ({ type: 'Polygon', coordinates: coords as any, properties: { averageCrimeScore: 5 } });

describe('crime-aware routing', () => {
  it('prefers route that avoids polygon', () => {
    const a = { id: 'a', geometry: line([[0, 0], [0, 1]]), durationSeconds: 100 };
    const b = { id: 'b', geometry: line([[1, 0], [1, 1]]), durationSeconds: 120 };
    const high = poly([[
      [-0.1, 0.2],
      [0.1, 0.2],
      [0.1, 0.8],
      [-0.1, 0.8],
      [-0.1, 0.2],
    ]]);
    const { best } = selectCrimeSafeRoute([a, b], [high]);
    expect(best.id).toBe('b');
  });

  it('falls back to fastest when no polygons', () => {
    const a = { id: 'a', geometry: line([[0, 0], [0, 1]]), durationSeconds: 100 };
    const b = { id: 'b', geometry: line([[1, 0], [1, 1]]), durationSeconds: 200 };
    const { best } = selectCrimeSafeRoute([a, b], []);
    expect(best.id).toBe('a');
  });
});


