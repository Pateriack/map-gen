import { Delaunay } from 'd3-delaunay';
import { noiseMaker } from './noise';
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
    pointRelaxationIterations?: number;
    cornerRelaxationIterations?: number;
}

export interface Center {
    x: number;
    y: number;
    neighbours: number[]; // center index
    borders: number[]; // edge index
    corners: number[]; // corner index
    water: boolean;
    ocean: boolean;
    noise: number;
}

export interface Edge {
    d0: number; // delaunay center index
    d1: number; // delaunay center index
    v0: number; // voronoi corner index
    v1: number; // voronoi corner index
    dEdge: boolean; // is it a delaunay edge?
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
    
    const relaxationIterations = options.pointRelaxationIterations ?? 0;
    for (let i = 0; i < relaxationIterations; i++) {
       points = relaxPoints(points, options);
    }

    let graphs = buildLinkedGraphs(points, options);

    graphs = radialWater(graphs, options, rng);

    console.log(graphs);

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
        corners: [],
        ocean: false,
        water: false,
        noise: 0
    }));

    const delaunay = Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, options.width, options.height]);

    const cornersMap = new StringifiedKeyMap<Point, number>();
    const vEdgesMap = new StringifiedKeyMap<[number, number], number>();

    // Adds voronoi edge (no delaunay yet here)
    function addEdge(cornerIndexA: number, cornerIndexB: number, centerIndex: number) {
        const edgeKey = getEdgeKey(cornerIndexA, cornerIndexB);
        let edgeIndex = vEdgesMap.get(edgeKey);
        if (edgeIndex === undefined) {
            graphs.edges.push({
                v0: cornerIndexA,
                v1: cornerIndexB,
                d0: centerIndex,
                d1: -1,
                dEdge: false
            });
            edgeIndex = graphs.edges.length - 1
            vEdgesMap.set(edgeKey, edgeIndex);
            graphs.corners[cornerIndexA].protrudes.push(edgeIndex);
            graphs.corners[cornerIndexB].protrudes.push(edgeIndex);
            graphs.corners[cornerIndexA].adjacent.push(cornerIndexB);
            graphs.corners[cornerIndexB].adjacent.push(cornerIndexA);
            graphs.centers[centerIndex].borders.push(edgeIndex);
        } else {
            graphs.edges[edgeIndex].d1 = centerIndex;
            graphs.edges[edgeIndex].dEdge = true;
            const centerIndex2 = graphs.edges[edgeIndex].d0;
            graphs.centers[centerIndex].neighbours.push(centerIndex2);
            graphs.centers[centerIndex2].neighbours.push(centerIndex);
        }
    }

    // Push corners into graph
    for (let i = 0; i < points.length; i++) {
        const polygon = voronoi.cellPolygon(i);
        // store corners indices to create edges
        const cornerIndices: number[] = [];
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
                if (!cornerIndices.includes(cornerIndex)) {
                    cornerIndices.push(cornerIndex);
                }
            } 
        }
        addEdge(cornerIndices[cornerIndices.length - 1], cornerIndices[0], i);
        for (let k = 0; k < cornerIndices.length - 1; k++) {
            addEdge(cornerIndices[k], cornerIndices[k+1], i);
        }
    }

    function relaxCorners() {
        for (const corner of graphs.corners) {
            if (isEdgeOfMap(corner.x, corner.y, options)) {
                continue;
            }
            const polygon: Polygon = corner.touches.map(i => {
                const center = graphs.centers[i];
                return [center.x, center.y];
            })
            const centroid = calculateApproximateCentroid(polygon);
            corner.x = (corner.x + centroid[0]) / 2;
            corner.y = (corner.y + centroid[1]) / 2;
        }
    }

    if (options.cornerRelaxationIterations) {
        for (let i = 0; i < options.cornerRelaxationIterations; i++) {
            relaxCorners();
        }
    }

    return graphs;
}

function radialWater(graphs: LinkedGraphs, options: MapOptions, rng: RandomNumberGenerator): LinkedGraphs {
    const RATIO_THRESHOLD = 0.4;
    const RATIO_RANDOMIZATION = 0.15;
    const RATIO_NOISE_SCALING = 0.15;
    const CORNERS_REQUIRED_THRESHOLD = 0.5;

    const noise2D = noiseMaker(rng);

    const waterCorners = graphs.corners.map(corner => {
        const distanceFromCenter = calculateDistanceFromCenter(corner.x, corner.y, options);
        //todo: handle non-square maps better
        const ratioFromCenter = distanceFromCenter / Math.min(options.width, options.height);
        const randomizedRatio = ratioFromCenter + rng.getNumber(0 - RATIO_RANDOMIZATION / 2, RATIO_RANDOMIZATION / 2);
        const noise = noise2D(corner.x, corner.y);
        const ratioWithNoise = ratioFromCenter + (noise * RATIO_NOISE_SCALING);
        return ratioWithNoise > RATIO_THRESHOLD;
    });

    graphs.centers.forEach(center => {
        center.noise = noise2D(center.x, center.y);
        if (isCenterAtEdgeOfMap(center, graphs, options)) {
            center.water = true;
            return;
        }
        const numCorners = center.corners.length;
        const numWaterCorners = center.corners.reduce((acc, cornerIndex) => acc + (waterCorners[cornerIndex] ? 1 : 0), 0);
        const waterCornerRatio = numWaterCorners / numCorners;
        center.water = waterCornerRatio > CORNERS_REQUIRED_THRESHOLD;
    });

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

const isEdgeOfMap = (x: number, y: number, options: MapOptions): boolean => (
    x === 0 || x === options.width ||
    y === 0 || y === options.height
);

const isCenterAtEdgeOfMap = (center: Center, graphs: LinkedGraphs, options: MapOptions): boolean => {
    for (const cornerIndex of center.corners) {
        const corner = graphs.corners[cornerIndex];
        if (isEdgeOfMap(corner.x, corner.y, options)) {
            return true;
        }
    }
    return false;
};

const getCenterOfMap = (options: MapOptions): [number, number] => {
    return [options.width / 2, options.height / 2];
};

const calculateDistance = (x0: number, y0: number, x1: number, y1: number): number => {
    return Math.sqrt(Math.pow(x0 - x1, 2) + Math.pow(y0 - y1, 2));
}

const calculateDistanceFromCenter = (x: number, y: number, options: MapOptions): number => {
    const [cX, cY] = getCenterOfMap(options);
    return calculateDistance(x, y, cX, cY);
};

// const isCornerOfMap = (x: number, y: number): boolean => (
//     (x === 0 || x === options.width) &&
//     (y === 0 || y === options.height)
// );