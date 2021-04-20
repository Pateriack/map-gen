import { RandomNumberGenerator } from './random-number-generator';

export type Point = [x: number, y: number];

export interface GameMap {
    width: number;
    height: number;
    centerPoints: Point[];
}

export interface MapOptions {
    width: number;
    height: number;
    numPolygons: number;
    seed?: string;
}

export function generateMap(options: MapOptions): GameMap {
    const rng = new RandomNumberGenerator(options.seed);

    const centerPoints: Point[] = [];

    for (let i = 0; i < options.numPolygons; i++) {
        centerPoints.push([rng.getNumber(options.width), rng.getNumber(options.height)]);
    }

    return {
        width: options.width,
        height: options.height,
        centerPoints
    };
}

