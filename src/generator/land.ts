import { NoiseFunction } from "./noise";
import { LinkedGraphs, MapOptions } from "./types";
import { calculateDistanceFromCenter, findApproximateCenterAtCenterOfMap, isCenterAtEdgeOfMap } from "./utils";

const RATIO_THRESHOLD = 0.4;
const RATIO_NOISE_SCALING = 0.15;
const CORNERS_REQUIRED_THRESHOLD = 0.5;

export function makeLandmass(graphs: LinkedGraphs, options: MapOptions, getNewNoiseFn: () => NoiseFunction) {
    radialWater(graphs, options, getNewNoiseFn());

    fillOceans(graphs, options);
    removeLakes(graphs);
    fillMainland(graphs, options);
    markCoastal(graphs);
}

function radialWater(graphs: LinkedGraphs, options: MapOptions, noise: NoiseFunction) {
    const waterCorners = graphs.corners.map(corner => {
        const distanceFromCenter = calculateDistanceFromCenter(corner.x, corner.y, options);
        //todo: handle non-square maps better
        const ratioFromCenter = distanceFromCenter / Math.min(options.width, options.height);
        const noiseValue = noise(corner.x, corner.y);
        const ratioWithNoise = ratioFromCenter + (noiseValue * RATIO_NOISE_SCALING);
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
}

function fillOceans(graphs: LinkedGraphs, options: MapOptions) {
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
}

function removeLakes(graphs: LinkedGraphs) {
    graphs.centers.forEach(center => {
        if (center.water && !center.ocean) {
            center.water = false;
        }
    });
}

function fillMainland(graphs: LinkedGraphs, options: MapOptions) {
    const centerIndex = findApproximateCenterAtCenterOfMap(graphs, options);

    const visited: boolean[] = [];
    const stack: number[] = [];

    stack.push(centerIndex);

    while (stack.length) {
        const index = stack.pop();

        if (index === undefined) continue;

        graphs.centers[index].mainland = true;

        visited[index] = true;

        graphs.centers[index].neighbours.forEach(neighbourIndex => {
            if (!visited[neighbourIndex] && !graphs.centers[neighbourIndex].ocean) {
                stack.push(neighbourIndex);
            }
        });
    }
}

function markCoastal(graphs: LinkedGraphs) {
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
}