export type Point = number[];

export type Polygon = Point[];

export interface GameMap {
    width: number;
    height: number;
    graphs: LinkedGraphs;
    regions: Region[];
}

export interface MapOptions {
    width: number;
    height: number;
    numPolygons: number;
    seed: string;
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
    area: number;
    mainland: boolean;
    coastal: boolean;
}

export interface Edge {
    d0: number; // delaunay center index
    d1: number; // delaunay center index
    v0: number; // voronoi corner index
    v1: number; // voronoi corner index
    dEdge: boolean; // is it a delaunay edge?
    coastal: boolean;
    water: boolean;
}

export interface Corner {
    x: number;
    y: number;
    touches: number[]; // center index
    protrudes: number[]; // edge index
    adjacent: number[]; // corner index
    coastal: boolean;
}

export interface LinkedGraphs {
    centers: Center[];
    edges: Edge[];
    corners: Corner[];
}

export interface Region {
    centers: number[];
    peninsula: boolean;
}