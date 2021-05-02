import { RoundedCornerSharp } from '@material-ui/icons';
import { Delaunay } from 'd3-delaunay';
import { noiseMaker } from './noise';
import { RandomNumberGenerator } from './random-number-generator';
import { GameMap, LinkedGraphs, MapOptions, Point, Polygon } from './types';
import { calculateApproximateCentroid, calculateAreaOfAllPolygons, calculateDistanceFromCenter, findApproximateCenterAtCenterOfMap, getEdgeKey, isCenterAtEdgeOfMap, isEdgeOfMap, StringifiedKeyMap } from './utils';

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

    calculateAreaOfAllPolygons(graphs);

    graphs = radialWater(graphs, options, rng);

    graphs = fillOceans(graphs, options);
    graphs = removeLakes(graphs);
    graphs = fillMainland(graphs, options);
    graphs = markCoastal(graphs);

    console.log(graphs);

    return {
        width: options.width,
        height: options.height,
        graphs
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
        coastal: false
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
                water: false
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
                    coastal: false
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
    const RATIO_NOISE_SCALING = 0.15;
    const CORNERS_REQUIRED_THRESHOLD = 0.5;

    const noise2D = noiseMaker(rng);

    const waterCorners = graphs.corners.map(corner => {
        const distanceFromCenter = calculateDistanceFromCenter(corner.x, corner.y, options);
        //todo: handle non-square maps better
        const ratioFromCenter = distanceFromCenter / Math.min(options.width, options.height);
        const noise = noise2D(corner.x, corner.y);
        const ratioWithNoise = ratioFromCenter + (noise * RATIO_NOISE_SCALING);
        return ratioWithNoise > RATIO_THRESHOLD;
    });

    graphs.centers.forEach(center => {
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

function fillOceans(graphs: LinkedGraphs, options: MapOptions): LinkedGraphs {
    let startingIndex = graphs.centers.findIndex(center => isCenterAtEdgeOfMap(center, graphs, options));

    if (isNaN(startingIndex)){
        return graphs;
    }

    const visited: boolean[] = [];
    const stack: number[] = [];

    stack.push(startingIndex);

    while (stack.length) {
        const index = stack.pop();

        if (index === undefined) continue;

        graphs.centers[index].ocean = true;

        if (!visited[index]) {
            visited[index] = true;
        }

        graphs.centers[index].neighbours.forEach(neighbourIndex => {
            if (!visited[neighbourIndex] && graphs.centers[neighbourIndex].water) {
                stack.push(neighbourIndex);
            }
        });

    }

    graphs.edges.forEach(edge => {
        if (
            !edge.dEdge ||
            (graphs.centers[edge.d0].water && graphs.centers[edge.d1].water)
        ) {
            edge.water = true;
        }
    });

    return graphs;
}

function removeLakes(graphs: LinkedGraphs): LinkedGraphs {
    graphs.centers.forEach(center => {
        if (center.water && !center.ocean) {
            center.water = false;
        }
    });
    return graphs;
}

function fillMainland(graphs: LinkedGraphs, options: MapOptions): LinkedGraphs {
    const centerIndex = findApproximateCenterAtCenterOfMap(graphs, options);

    const visited: boolean[] = [];
    const stack: number[] = [];

    stack.push(centerIndex);

    while (stack.length) {
        const index = stack.pop();

        if (index === undefined) continue;

        graphs.centers[index].mainland = true;

        if (!visited[index]) {
            visited[index] = true;
        }

        graphs.centers[index].neighbours.forEach(neighbourIndex => {
            if (!visited[neighbourIndex] && !graphs.centers[neighbourIndex].ocean) {
                stack.push(neighbourIndex);
            }
        });
    }

    return graphs;
}

function markCoastal(graphs: LinkedGraphs): LinkedGraphs {
    graphs.corners.forEach(corner => {
        let oceanFound = false;
        let landFound = false;

        for (let i = 0; i < corner.touches.length; i++) {
            const center = graphs.centers[corner.touches[i]];
            if (center.ocean) {
                oceanFound = true;
            } else if (!center.water) {
                landFound = true;
            }

            if (oceanFound && landFound) {
                corner.coastal = true;
                break;
            }
        }     
    });

    graphs.centers.forEach(center => {
        for (let i = 0; i < center.corners.length; i++) {
            const corner = graphs.corners[center.corners[i]];
            if (corner.coastal) {
                center.coastal = true;
                break;
            }
        }
    });

    graphs.edges.forEach(edge => {
        const cornerA = graphs.corners[edge.v0];
        const cornerB = graphs.corners[edge.v1];
        if (
            (cornerA.coastal && cornerB.coastal) &&
            edge.dEdge &&
            (!graphs.centers[edge.d0].water === graphs.centers[edge.d1].water)
        ) {
            edge.coastal = true;
        }
    });

    return graphs;
}