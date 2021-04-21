import { Delaunay } from 'd3-delaunay';
import { RandomNumberGenerator } from './random-number-generator';

export type Point = number[];

export type Polygon = Point[];

export interface GameMap {
    width: number;
    height: number;
    points: Point[];
    voronoiPolygons: Polygon[];
}

export interface MapOptions {
    width: number;
    height: number;
    numPolygons: number;
    seed?: string;
    relaxationIterations?: number;
}

export function generateMap(options: MapOptions): GameMap {

    function calculateVoronoiPolygons(points: Point[]): Polygon[] {
        const voronoiPolygons: Polygon[] = [];
    
        const delaunay = Delaunay.from(points);
        console.log(delaunay);
        const voronoi = delaunay.voronoi([0, 0, options.width, options.height]);
    
        for (let i = 0; i < points.length; i++) {
            voronoiPolygons[i] = voronoi.cellPolygon(i);
        }
    
        return voronoiPolygons;
    }

    function relax(voronoiPolygons: Polygon[]): [Point[], Polygon[]] {
        const points = voronoiPolygons.map(calculateApproximateCentroid);
        return [points, calculateVoronoiPolygons(points)];
    }

    const rng = new RandomNumberGenerator(options.seed);

    let points: Point[] = [];
    let voronoiPolygons: Polygon[] = [];

    for (let i = 0; i < options.numPolygons; i++) {
        points.push([rng.getNumber(options.width), rng.getNumber(options.height)]);
    }

    voronoiPolygons = calculateVoronoiPolygons(points);
    
    const relaxationIterations = options.relaxationIterations ?? 0;
    for (let i = 0; i < relaxationIterations; i++) {
        [points, voronoiPolygons] = relax(voronoiPolygons);
    }

    console.log(points);
    console.log(voronoiPolygons);

    return {
        width: options.width,
        height: options.height,
        points,
        voronoiPolygons
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