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
    neighbours: number[]; // center index
    borders: number[]; // edge index
    corners: number[]; // corner index
}

export interface Edge {
    d0: number; // delaunay center index
    d1: number; // delaunay center index
    v0: number; // voronoi corner index
    v1: number; // voronoi corner index
}

export interface Corner {
    x: number;
    y: number;
    touches: number[]; // center index
    protrudes: number[]; // edge index
    adjacent: number[]; // corner index
}

export interface LinkedGraphs {
    centers: Center[];
    edges: Edge[];
    corners: Corner[];
}

export function generateMap(options: MapOptions): GameMap {

    const rng = new RandomNumberGenerator(options.seed);

    let points: Point[] = [];

    for (let i = 0; i < options.numPolygons; i++) {
        points.push([rng.getNumber(options.width), rng.getNumber(options.height)]);
    }
    
    const relaxationIterations = options.relaxationIterations ?? 0;
    for (let i = 0; i < relaxationIterations; i++) {
       points = relaxPoints(points, options);
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

function calculateVoronoiPolygons(points: Point[], options: MapOptions): Polygon[] {
    const voronoiPolygons: Polygon[] = [];

    const delaunay = Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, options.width, options.height]);

    for (let i = 0; i < points.length; i++) {
        voronoiPolygons[i] = voronoi.cellPolygon(i);
    }

    return voronoiPolygons;
}

function relaxPoints(points: Point[], options: MapOptions): Point[] {
    const voronoiPolygons = calculateVoronoiPolygons(points, options);
    points = voronoiPolygons.map(calculateApproximateCentroid);
    return points;
}

function buildLinkedGraphs(points: Point[], options: MapOptions): LinkedGraphs {
    const graphs: LinkedGraphs = {
        centers: [],
        edges: [],
        corners: []
    };

    graphs.centers = points.map(point => ({
        x: point[0],
        y: point[1],
        neighbours: [],
        borders: [],
        corners: []
    }));

    const delaunay = Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, options.width, options.height]);

    const cornersMap: Map<[number, number], number> = new Map();

    for (let i = 0; i < points.length; i++) {
        const polygon = voronoi.cellPolygon(i);
        for (let j = 0; j < polygon.length; j++) {
            const polygonPoint: [number, number] = [polygon[j][0], polygon[j][1]];
            if (!cornersMap.has(polygonPoint)) {
                graphs.corners.push({
                    x: polygonPoint[0],
                    y: polygonPoint[1],
                    touches: [],
                    protrudes: [],
                    adjacent: []
                })
            }
        }
    }

    return graphs;
}