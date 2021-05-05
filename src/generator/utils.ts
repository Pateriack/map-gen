import { Center, LinkedGraphs, MapOptions, Point, Polygon, Region } from "./types";

export class StringifiedKeyMap <T, U> {
    private map: Map<string, U> = new Map();

    set(key: T, value: U) {
        this.map.set(JSON.stringify(key), value);
    }

    has(key: T): boolean {
        return this.map.has(JSON.stringify(key));
    }

    get(key: T): U | undefined {
        return this.map.get(JSON.stringify(key));
    }
}

export function getEdgeKey(a: number, b: number): [number, number] {
    return [Math.min(a, b), Math.max(a, b)];
}

export function isEdgeOfMap(x: number, y: number, options: MapOptions): boolean {
    return (
        x === 0 || x === options.width ||
        y === 0 || y === options.height
    );
}

export function isCenterAtEdgeOfMap(center: Center, graphs: LinkedGraphs, options: MapOptions): boolean {
    for (const cornerIndex of center.corners) {
        const corner = graphs.corners[cornerIndex];
        if (isEdgeOfMap(corner.x, corner.y, options)) {
            return true;
        }
    }
    return false;
}

export function getCenterOfMap(options: MapOptions): [number, number] {
    return [options.width / 2, options.height / 2];
}

export function calculateDistance(x0: number, y0: number, x1: number, y1: number): number {
    return Math.sqrt(Math.pow(x0 - x1, 2) + Math.pow(y0 - y1, 2));
}

export function calculateDistanceFromCenter(x: number, y: number, options: MapOptions): number {
    const [cX, cY] = getCenterOfMap(options);
    return calculateDistance(x, y, cX, cY);
}

export function calculatePolygonArea(centerIndex: number, graphs: LinkedGraphs): number {
    const center = graphs.centers[centerIndex];
    const numPoints = center.corners.length;
    let area = 0;
    let j = numPoints - 1;
    for (let i = 0; i < numPoints; i++) {
        const cornerI = graphs.corners[center.corners[i]];
        const cornerJ = graphs.corners[center.corners[j]];
        area += (cornerJ.x + cornerI.x) * (cornerJ.y - cornerI.y);
        j = i;
    }
    return Math.abs(area / 2);
}

export function calculateAreaOfAllPolygons(graphs: LinkedGraphs) {
    for (let i = 0; i < graphs.centers.length; i++) {
        graphs.centers[i].area = calculatePolygonArea(i, graphs);
    }
}

export function findApproximateCenterAtCenterOfMap(graphs: LinkedGraphs, options: MapOptions): number {
    const centerOfMapX = options.width / 2;
    const centerOfMapY = options.height / 2;

    let center = graphs.centers[0];
    let closestIndex = 0;
    let closestDistance = calculateDistance(center.x, center.y, centerOfMapX, centerOfMapY);

    for (let index = 1; index < graphs.centers.length; index++) {
        center = graphs.centers[index];
        const distance = calculateDistance(center.x, center.y, centerOfMapX, centerOfMapY);
        if (distance < closestDistance) {
            closestIndex = index;
            closestDistance = distance;
        }
    }

    return closestIndex;
}

export function calculateApproximateCentroid(polygon: Polygon): Point {
    var  l = polygon.length;

    return polygon.reduce((center, p, i) => {
        center[0] += p[0];
        center[1] += p[1];

        if (i === l - 1) {
            center[0] /= l;
            center[1] /= l;
        }

        return center;
    }, [0, 0]);
}

export function findAngle(a: Point, b: Point, c: Point) {
    var AB = Math.sqrt(Math.pow(b[0]-a[0],2)+ Math.pow(b[1]-a[1],2));    
    var BC = Math.sqrt(Math.pow(b[0]-c[0],2)+ Math.pow(b[1]-c[1],2)); 
    var AC = Math.sqrt(Math.pow(c[0]-a[0],2)+ Math.pow(c[1]-a[1],2));
    return Math.acos((BC*BC+AB*AB-AC*AC)/(2*BC*AB));
}

// Converts from degrees to radians.
export function toRadians(degrees: number) {
  return degrees * Math.PI / 180;
};
 
// Converts from radians to degrees.
export function toDegrees(radians: number) {
  return radians * 180 / Math.PI;
}


export function calculateBearing(x0: number, y0: number, x1: number, y1: number) {
  x0 = toRadians(x0);
  y0 = toRadians(y0);
  x1 = toRadians(x1);
  y1 = toRadians(y1);

  const y = Math.sin(y1 - y0) * Math.cos(x1);
  const x = Math.cos(x0) * Math.sin(x1) -
        Math.sin(x0) * Math.cos(x1) * Math.cos(y1 - y0);
  let brng = Math.atan2(y, x);
  brng = toDegrees(brng);
  return (brng + 360) % 360;
}

export function calculateAbsBearingDifference(a: number, b: number) {
    return Math.min(
        Math.abs(a - b),
        (360 - Math.max(a, b)) + Math.min(a, b)
    );
}

export function calculateClockwiseBearingDifference(a: number, b: number) {
    return b > a ? b - a : 360 - a + b
}

export function calculateAreaOfRegion(region: Region, graphs: LinkedGraphs): number {
    return region.centers.reduce((area, i) => {
        return area + calculatePolygonArea(i, graphs);
    }, 0);
}

export function calculateDistanceFromOcean(x: number, y: number, graphs: LinkedGraphs, options: MapOptions): number {
    return graphs.corners
        .filter(corner => corner.coastal)
        .reduce((closest, corner) => {
            const distance = calculateDistance(x, y, corner.x, corner.y);
            return Math.min(closest, distance);
        }, Math.sqrt(Math.pow(options.width, 2) + Math.pow(options.height, 2)));
}