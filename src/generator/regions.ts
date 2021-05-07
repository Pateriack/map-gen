import { MapOptions } from ".";
import { calculateDistanceFromNearestLakeCorner } from "./lakes";
import { RandomNumberGenerator } from "./random-number-generator";
import { LinkedGraphs, Region } from "./types";

export function createRegions(graphs: LinkedGraphs, options: MapOptions, regions: Region[], rng: RandomNumberGenerator) {
    
}

function createStartingRegion(graphs: LinkedGraphs, options: MapOptions, regions: Region[], rng: RandomNumberGenerator) {
    const validCoastalCenters: number[] = [];
    const distanceFromLake: number[] = [];

    for (let i = 0; i < graphs.centers.length; i++) {
        const center = graphs.centers[i];

        if (center.mainland && center.coastal && !isPartOfRegion(i, regions)) {
            validCoastalCenters.push(i);
        }
    }


    for (let i = 0; i < validCoastalCenters.length; i++) {
        const index = validCoastalCenters[i];
        const center = graphs.centers[index];
        distanceFromLake[index] = calculateDistanceFromNearestLakeCorner(center.x, center.y, graphs, options);
    }

    validCoastalCenters.sort((a, b) => {
        return distanceFromLake[a] - distanceFromLake[b];
    });
}

function isPartOfRegion(index: number, regions: Region[]): boolean {
    for (let i = 0; i < regions.length; i++) {
        const region = regions[i];
        for (let j = 0; j < region.centers.length; j++) {
            if (index === region.centers[j]) {
                return true;
            }
        }
    }
    return false;
}