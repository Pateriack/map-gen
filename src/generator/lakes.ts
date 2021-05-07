import { MapOptions } from ".";
import { RandomNumberGenerator } from "./random-number-generator";
import { LinkedGraphs, Region } from "./types";
import { calculateDistance, calculateDistanceFromCenter, calculateDistanceFromOcean, calculatePolygonArea, getMaxDistance } from "./utils";

const DEBUG_COLOR = '#734AD1';
const MIN_NUM_LAKES = 1;
const MAX_NUM_LAKES = 4;
const MIN_LAKE_SIZE = 1000;
const MAX_LAKE_SIZE = 4000;
const MINIMUM_DISTANCE_FROM_OCEAN = 50;
const MINIMUM_DISTANCE_FROM_MAP_CENTER = 100;

export function generateLakes(graphs: LinkedGraphs, regions: Region[], options: MapOptions, rng: RandomNumberGenerator) {
    let validPositions: number[] = [];
    for (let i = 0; i < graphs.centers.length; i++) {
        if (isValidLakePosition(i, graphs, regions, options)) {
            validPositions.push(i);
        }
    }

    const numLakes = rng.getNumber(MIN_NUM_LAKES, MAX_NUM_LAKES);

    for (let i = 0; i < numLakes; i++) {
        const targetLakeArea = rng.getInt(MIN_LAKE_SIZE, MAX_LAKE_SIZE);

        const indexes: number[] = [];
        let availableIndexes = [...validPositions];
        let area = 0;

        while(area < targetLakeArea && availableIndexes.length > 0) {
            const nextIndex = availableIndexes[rng.getInt(availableIndexes.length - 1)];
            indexes.push(nextIndex);

            validPositions = validPositions.filter(index => index !== nextIndex);

            area += calculatePolygonArea(nextIndex, graphs);

            availableIndexes = [];

            indexes.forEach(j => {
                graphs.centers[j].neighbours.forEach(k => {
                    if (validPositions.includes(k)) {
                        availableIndexes.push(k);
                    }
                });
            });
        }

        const positionsToRemove: number[] = [];

        indexes.forEach(j => {
            graphs.centers[j].neighbours.forEach(k => {
                positionsToRemove.push(k);

                graphs.centers[k].neighbours.forEach(l => {
                    if (!positionsToRemove.includes(l)) {
                        positionsToRemove.push(l);
                    }
                });
            });

            graphs.centers[j].water = true;
        });

        validPositions = validPositions.filter(j => !positionsToRemove.includes(j));
    }

    removeIslands(graphs);
    markLakeshore(graphs);
    markWaterEdges(graphs);
}

function isValidLakePosition (centerIndex: number, graphs: LinkedGraphs, regions: Region[], options: MapOptions): boolean {
    const center = graphs.centers[centerIndex];

    if (!center.mainland || center.coastal) {
        return false;
    }

    let isPeninsula = false;
    for (const region of regions) {
        if (isPeninsula) {
            break;
        }
        if (!region.peninsula) {
            continue;
        }
        for (const i of region.centers) {
            if (i === centerIndex) {
                isPeninsula = true;
                break;
            }
        }
    }

    if (isPeninsula) {
        return false;
    }

    const distanceFromOcean = calculateDistanceFromOcean(center.x, center.y, graphs, options);

    if (distanceFromOcean < MINIMUM_DISTANCE_FROM_OCEAN) {
        return false;
    }

    const distanceFromCenter = calculateDistanceFromCenter(center.x, center.y, options);

    if (distanceFromCenter < MINIMUM_DISTANCE_FROM_MAP_CENTER) {
        return false;
    }

    return true;
}

function removeIslands(graphs: LinkedGraphs) {
    let startingIndex = 0;

    for(let i = 0; i < graphs.centers.length; i++) {
        const center = graphs.centers[i];

        if (center.coastal && center.mainland) {
            startingIndex = i;
            break;
        }
    }

    const visited: boolean[] = [];
    const stack: number[] = [];

    stack.push(startingIndex);

    while (stack.length) {
        const index = stack.pop();

        if (index === undefined) continue;

        visited[index] = true;

        graphs.centers[index].neighbours.forEach(neighbourIndex => {
            if (!visited[neighbourIndex] && graphs.centers[neighbourIndex].mainland && !graphs.centers[neighbourIndex].water) {
                stack.push(neighbourIndex);
            }
        });
    }

    graphs.centers.forEach((center, index) => {
        if (!visited[index] && !center.water && center.mainland) {
            center.water = true;
        }
    });
}

function markLakeshore(graphs: LinkedGraphs) {
    graphs.corners.forEach(corner => {
        let lakeFound = false;
        let landFound = false;

        for (let i = 0; i < corner.touches.length; i++) {
            const center = graphs.centers[corner.touches[i]];
            if (center.water && !center.ocean) {
                lakeFound = true;
            } else if (!center.water) {
                landFound = true;
            }

            if (lakeFound && landFound) {
                corner.lakeshore = true;
                break;
            }
        }     
    });

    graphs.centers.forEach(center => {
        for (let i = 0; i < center.corners.length; i++) {
            const corner = graphs.corners[center.corners[i]];
            if (corner.lakeshore) {
                center.lakeshore = true;
                break;
            }
        }
    });

    graphs.edges.forEach(edge => {
        const cornerA = graphs.corners[edge.v0];
        const cornerB = graphs.corners[edge.v1];
        if (
            (cornerA.lakeshore && cornerB.lakeshore) &&
            edge.dEdge &&
            (!graphs.centers[edge.d0].water === graphs.centers[edge.d1].water)
        ) {
            edge.lakeshore = true;
        }
    });
}

function markWaterEdges(graphs: LinkedGraphs) {
    graphs.edges.forEach(edge => {
        if (
            !edge.dEdge ||
            (graphs.centers[edge.d0].water && graphs.centers[edge.d1].water)
        ) {
            edge.water = true;
        }
    });
}

export function calculateDistanceFromNearestLakeCorner(x: number, y: number, graphs: LinkedGraphs, options: MapOptions): number {
    return graphs.corners
        .filter(corner => corner.lakeshore)
        .reduce((minDistance, corner) => {
            const distance = calculateDistance(x, y, corner.x, corner.y);
            return Math.min(minDistance, distance);
        }, getMaxDistance(options));
}