import { Delaunay } from 'd3-delaunay';
import { RandomNumberGenerator } from './random-number-generator';

export type Point = number[];

export type Polygon = Point[];

export interface GameMap {
    width: number;
    height: number;
    graphs: LinkedGraphs;
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

    const graphs = buildLinkedGraphs(points, options);

    return {
        width: options.width,
        height: options.height,
        graphs
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

    // Push centers into graph
    graphs.centers = points.map(point => ({
        x: point[0],
        y: point[1],
        neighbours: [],
        borders: [],
        corners: []
    }));

    const delaunay = Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, options.width, options.height]);

    const cornersMap = new StringifiedKeyMap<Point, number>();
    const vEdgesMap = new StringifiedKeyMap<[number, number], number>();

    // Adds voronoi edge (no delaunay yet here)
    function addEdge(cornerIndexA: number, cornerIndexB: number) {
        const edgeKey = getEdgeKey(cornerIndexA, cornerIndexB);
        let edgeIndex = vEdgesMap.get(edgeKey);
        if (edgeIndex === undefined) {
            graphs.edges.push({
                v0: cornerIndexA,
                v1: cornerIndexB,
                d0: -1,
                d1: -1
            });
            edgeIndex = graphs.edges.length - 1
            vEdgesMap.set(edgeKey, edgeIndex);
            graphs.corners[cornerIndexA].protrudes.push(edgeIndex);
            graphs.corners[cornerIndexB].protrudes.push(edgeIndex);
            graphs.corners[cornerIndexA].adjacent.push(cornerIndexB);
            graphs.corners[cornerIndexB].adjacent.push(cornerIndexA);
        }
        return edgeIndex;
    }

    // Push corners into graph
    for (let i = 0; i < points.length; i++) {
        const polygon = voronoi.cellPolygon(i);
        // store corners indices to create edges
        const indices: number[] = [];
        for (let j = 0; j < polygon.length; j++) {
            const polygonPoint: [number, number] = [polygon[j][0], polygon[j][1]];
            if (!cornersMap.has(polygonPoint)) {
                graphs.corners.push({
                    x: polygonPoint[0],
                    y: polygonPoint[1],
                    touches: [],
                    protrudes: [],
                    adjacent: []
                });
                cornersMap.set(polygonPoint, graphs.corners.length - 1);
            }
            const cornerIndex = cornersMap.get(polygonPoint);
            if (cornerIndex !== undefined){
                if(!graphs.centers[i].corners.includes(cornerIndex)) {
                    graphs.centers[i].corners.push(cornerIndex);
                }
                if(!graphs.corners[cornerIndex].touches.includes(i)) {
                    graphs.corners[cornerIndex].touches.push(i);
                }
                if (!indices.includes(cornerIndex)) {
                    indices.push(cornerIndex);
                }
            } 
        }
        let edgeIndex = addEdge(indices[0], indices[indices.length - 1]);
        for (let k = 0; k < indices.length - 2; k++) {
            edgeIndex = addEdge(indices[k], indices[k+1]);
        }
    }

    console.log(graphs);

    return graphs;
}

class StringifiedKeyMap <T, U> {
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

function getEdgeKey(a: number, b: number): [number, number] {
    return [Math.min(a, b), Math.max(a, b)];
}