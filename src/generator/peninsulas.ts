import { LinkedGraphs, MapOptions, Region } from "./types";
import { calculateAreaOfRegion, calculateDistance, calculatePolygonArea, findApproximateCenterAtCenterOfMap } from "./utils";

export function detectPeninsulas(graphs: LinkedGraphs, options: MapOptions): Region[] {
    const DEBUG_COLOR = '#4AD1AA';
    const COASTAL_NEIGHBOUR_THRESHOLD = 3;
    const MAX_MOUTH_WIDTH = 150;
    const MAX_MOUTH_TO_AREA_RATIO = 0.02;
    const ADD_NEARLY_SURROUNDED_POLYGONS_ITERATIONS = 2;

    let partOfPeninsula = graphs.centers
        .map(center => {
            if (!center.coastal || !center.mainland) {
                return false;
            }
            let coastalNeighbours = 0;
            let nonCoastalNeighbours = 0;
            center.neighbours.forEach(j => {
                const neighbour = graphs.centers[j];
                if (neighbour.coastal && neighbour.mainland) {
                    coastalNeighbours++;
                } else if (neighbour.mainland) {
                    nonCoastalNeighbours++;
                }
            });
            return (
                coastalNeighbours >= COASTAL_NEIGHBOUR_THRESHOLD ||
                nonCoastalNeighbours === 0 ||
                coastalNeighbours > nonCoastalNeighbours
            );
        });

    
    floodFillPeninsulas(graphs, options, partOfPeninsula);
    removeLowPolygonPeninsulas(graphs, partOfPeninsula);

    let peninsulas = createPeninsulaRegions(graphs, partOfPeninsula);
    peninsulas = peninsulas.filter(peninsula => {
        const mouthWidth = getPeninsulaMouthWidth(graphs, peninsula);
        const area = calculateAreaOfRegion(peninsula, graphs);
        return mouthWidth <= MAX_MOUTH_WIDTH && mouthWidth / area <= MAX_MOUTH_TO_AREA_RATIO;
    });

    for (let i = 0; i < ADD_NEARLY_SURROUNDED_POLYGONS_ITERATIONS; i++) {
        addNearlySurroundedPolygonsToPeninsulas(peninsulas, graphs);
    }

    peninsulas.forEach(peninsula => {
        peninsula.centers.forEach(i => {
            // graphs.centers[i].debugColor = DEBUG_COLOR;
        });
    });

    return peninsulas;
}

function removeLowPolygonPeninsulas(graphs: LinkedGraphs, partOfPeninsula: boolean[]) {
    const MINIMUM_POLYGONS_THRESHOLD = 3;
    const visited: boolean[] = [];

    partOfPeninsula.forEach((isPeninsula, i) => {
        if (!isPeninsula || visited[i]) {
            return;
        }
        let numPolygons = 0;
        let thisPeninsula: number[] = [];
        let stack = [i];

        while (stack.length) {
            const j = stack.pop();

            if (j === undefined) continue;

            const centerJ = graphs.centers[j];

            visited[j] = true;
            numPolygons++;
            thisPeninsula.push(j);

            centerJ.neighbours.forEach(k => {
                if (!visited[k] && partOfPeninsula[k]) {
                    stack.push(k);
                }
            });
        }

        if (numPolygons < MINIMUM_POLYGONS_THRESHOLD) {
            thisPeninsula.forEach(j => {
                partOfPeninsula[j] = false;
            })
        }
    });
}

function removeSmallPeninsulas(graphs: LinkedGraphs, partOfPeninsula: boolean[]) {
    const MINIMUM_AREA = 3200;
    const visited: boolean[] = [];

    partOfPeninsula.forEach((isPeninsula, i) => {
        if (!isPeninsula || visited[i]) {
            return;
        }
        let area = 0;
        let thisPeninsula: number[] = [];
        let stack = [i];

        while (stack.length) {
            const j = stack.pop();

            if (j === undefined) continue;

            const centerJ = graphs.centers[j];

            visited[j] = true;
            area += calculatePolygonArea(j, graphs);
           
            thisPeninsula.push(j);

            centerJ.neighbours.forEach(k => {
                if (!visited[k] && partOfPeninsula[k]) {
                    stack.push(k);
                }
            });
        }

        if (area < MINIMUM_AREA) {
            thisPeninsula.forEach(j => {
                partOfPeninsula[j] = false;
            })
        }
    });
}

function floodFillPeninsulas(graphs: LinkedGraphs, options: MapOptions, partOfPeninsula: boolean[]) {
    const centerIndex = findApproximateCenterAtCenterOfMap(graphs, options);

    const visited: boolean[] = [];
    const stack: number[] = [];

    stack.push(centerIndex);

    while (stack.length) {
        const index = stack.pop();

        if (index === undefined) continue;

        visited[index] = true;

        graphs.centers[index].neighbours.forEach(neighbourIndex => {
            if (!visited[neighbourIndex] && !partOfPeninsula[neighbourIndex] && graphs.centers[neighbourIndex].mainland) {
                stack.push(neighbourIndex);
            }
        });
    }

    for (let i = 0; i < graphs.centers.length; i++) {
        const center = graphs.centers[i];
        partOfPeninsula[i] = !visited[i] && center.mainland;
    }
}

function createPeninsulaRegions(graphs: LinkedGraphs, partOfPeninsula: boolean[]): Region[] {
    const regions: Region[] = [];

    const visited: boolean[] = [];

    partOfPeninsula.forEach((isPeninsula, i) => {
        if (!isPeninsula || visited[i]) {
            return;
        }
        let thisPeninsula: number[] = [];
        let stack = [i];

        while (stack.length) {
            const j = stack.pop();

            if (j === undefined) continue;

            const centerJ = graphs.centers[j];

            visited[j] = true;
            thisPeninsula.push(j);

            centerJ.neighbours.forEach(k => {
                if (!visited[k] && partOfPeninsula[k]) {
                    stack.push(k);
                }
            });
        }

        regions.push({
            centers: thisPeninsula,
            peninsula: true
        });
    });

    return regions;
}

function getPeninsulaMouthWidth(graphs: LinkedGraphs, region: Region): number {
    const corners: number[] = [];
    region.centers.forEach(i => {
        const center = graphs.centers[i];
        center.corners.forEach(j => {
            const corner = graphs.corners[j];
            if (!corner.coastal) {
                return;
            }
            let waterFound = false;
            let peninsulaFound = false;
            let nonPeninsulaFound = false;
            corner.touches.forEach(k => {
                const centerJ = graphs.centers[k];
                if (centerJ.ocean) {
                    waterFound = true;
                } else if (region.centers.includes(k)) {
                    peninsulaFound = true;
                } else {
                    nonPeninsulaFound = true;
                }
            });
            if (waterFound && peninsulaFound && nonPeninsulaFound && !corners.includes(j)) {
                corners.push(j);
            }
        });
    });

    if (corners.length < 2) {
        return 0;
    }
    
    const cornerA = graphs.corners[corners[0]];
    const cornerB = graphs.corners[corners[1]];

    return calculateDistance(cornerA.x, cornerA.y, cornerB.x, cornerB.y);
}

function addNearlySurroundedPolygonsToPeninsulas(peninsulas: Region[], graphs: LinkedGraphs) {
    peninsulas.forEach(peninsula => {
        peninsula.centers.forEach(i => {
            let centersToAdd: number[] = [];
            const centerI = graphs.centers[i];
            centerI.neighbours.forEach(j => {
                const centerJ = graphs.centers[j];
                if (peninsula.centers.includes(j) || !centerJ.mainland) {
                    return;
                }
                let numPeninsula = 0;
                let numNonPeninsula = 0;
                centerJ.neighbours.forEach(k => {
                    if (peninsula.centers.includes(k)) {
                        numPeninsula++;
                    } else {
                        numNonPeninsula++;
                    }
                });
                if(numPeninsula >= numNonPeninsula) {
                    centersToAdd.push(j);
                }
            });
            peninsula.centers.push(...centersToAdd);
        });
    });
}