import { Delaunay } from 'd3-delaunay';
import { generateLakes } from './lakes';
import { makeLandmass } from './land';
import { NoiseFunction, noiseMaker } from './noise';
import { detectPeninsulas } from './peninsulas';
import { RandomNumberGenerator } from './random-number-generator';
import { GameMap, LinkedGraphs, MapOptions, Point, Polygon, Center, Corner, Edge, Region } from './types';
import { calculateApproximateCentroid, calculateAreaOfAllPolygons, getEdgeKey, isEdgeOfMap, StringifiedKeyMap } from './utils';

export type { GameMap, MapOptions, Center, Corner, Edge };

export function generateMap(options: MapOptions): GameMap {

    const rng = new RandomNumberGenerator(options.seed);

    let noiseCounter = 0;
    const getNewNoiseFn = (): NoiseFunction => {
        return noiseMaker(new RandomNumberGenerator(options.seed + noiseCounter));
    }

    let points: Point[] = [];

    for (let i = 0; i < options.numPolygons; i++) {
        points.push([rng.getNumber(options.width), rng.getNumber(options.height)]);
    }
    
    const relaxationIterations = options.pointRelaxationIterations ?? 0;
    for (let i = 0; i < relaxationIterations; i++) {
       points = relaxPoints(points, options);
    }

    let graphs = buildLinkedGraphs(points, options);

    calculateAreaOfAllPolygons(graphs);

    makeLandmass(graphs, options, getNewNoiseFn);

    let regions: Region[] = [];

    regions.push(...detectPeninsulas(graphs, options));

    generateLakes(graphs, regions, options, rng);

    return {
        width: options.width,
        height: options.height,
        graphs,
        regions
    };
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
        area: 0,
        mainland: false,
        coastal: false,
        lakeshore: false
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
                dEdge: false,
                coastal: false,
                water: false,
                lakeshore: false
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
                    adjacent: [],
                    coastal: false,
                    lakeshore: false
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


