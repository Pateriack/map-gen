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
}

export function generateMap(options: MapOptions): GameMap {
    const rng = new RandomNumberGenerator(options.seed);

    const points: Point[] = [];
    const voronoiPolygons: Polygon[] = [];

    for (let i = 0; i < options.numPolygons; i++) {
        points.push([rng.getNumber(options.width), rng.getNumber(options.height)]);
    }

    const delaunay = Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, options.width, options.height]);

    for (let i = 0; i < points.length; i++) {
        voronoiPolygons[i] = voronoi.cellPolygon(i);
    }

    return {
        width: options.width,
        height: options.height,
        points,
        voronoiPolygons
    };
}

