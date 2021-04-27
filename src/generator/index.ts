import { Delaunay } from 'd3-delaunay';
import { RandomNumberGenerator } from './random-number-generator';

export type Point = number[];

export type Polygon = Point[];

export interface GameMap {
    width: number;
    height: number;
    points: Point[];
}

export interface MapOptions {
    width: number;
    height: number;
    numPolygons: number;
    seed?: string;
    relaxationIterations?: number;
}

export interface Center {
    x: number;
    y: number;
    neighbours: Center[];
    borders: Edge[];
    corners: Corner[];
}

export interface Edge {
    d0: Center;
    d1: Center;
    v0: Corner;
    v1: Corner;
}

export interface Corner {
    x: number;
    y: number;
    touches: Center[];
    protrudes: Edge[];
    adjacent: Corner[];
}

export function generateMap(options: MapOptions): GameMap {

    function calculateVoronoiPolygons(points: Point[]): Polygon[] {
        const voronoiPolygons: Polygon[] = [];
    
        const delaunay = Delaunay.from(points);
        const voronoi = delaunay.voronoi([0, 0, options.width, options.height]);
    
        for (let i = 0; i < points.length; i++) {
            voronoiPolygons[i] = voronoi.cellPolygon(i);
        }
    
        return voronoiPolygons;
    }

    function relaxPoints(points: Point[]): Point[] {
        const voronoiPolygons = calculateVoronoiPolygons(points);
        points = voronoiPolygons.map(calculateApproximateCentroid);
        return points;
    }

    const rng = new RandomNumberGenerator(options.seed);

    let points: Point[] = [];

    for (let i = 0; i < options.numPolygons; i++) {
        points.push([rng.getNumber(options.width), rng.getNumber(options.height)]);
    }
    
    const relaxationIterations = options.relaxationIterations ?? 0;
    for (let i = 0; i < relaxationIterations; i++) {
       points = relaxPoints(points);
    }

    console.log(points);

    return {
        width: options.width,
        height: options.height,
        points
    };
}

function calculateApproximateCentroid(polygon: Polygon): Point {
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

// var l = points.length;
      
//         return points.reduce(function(center, p, i) {
//           center.x += p.x;
//           center.y += p.y;
      
//           if(i === l - 1) {
//               center.x /= l;
//               center.y /= l;
//           }
      
//           return center;
//         }, {x: 0, y: 0});