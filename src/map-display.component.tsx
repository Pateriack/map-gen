import React, { useEffect, useRef } from 'react';
import { Center, Corner, Edge, GameMap } from './generator';
import './map-display.css';

interface MapDisplayProps {
    gameMap: GameMap;
    options: MapDisplayOptions;
}

export interface MapDisplayOptions {
    centers?: boolean;
    centerLabels?: boolean;
    corners?: boolean;
    cornerLabels?: boolean;
    delaunayEdges?: boolean;
    delaunayEdgeLabels?: boolean;
    voronoiEdges?: boolean;
    voronoiEdgeLabels?: boolean;
}

export const MapDisplay: React.FC<MapDisplayProps> = ({
    gameMap,
    options
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, gameMap.width, gameMap.height);

        const drawPoint = (x: number, y: number, color?: string, label?: number | string) => {
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI, false);
            ctx.fillStyle = color ?? 'black';
            ctx.fill();
            if (label !== undefined) {
                drawLabel(label, x, y, 5, 10);
            }
        }

        const drawLine = (x0: number, y0: number, x1: number, y1: number, color: string, label?: number | string) => {
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.strokeStyle = color ?? 'black';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.closePath();
            const labelX = (x0 + x1) / 2;
            const labelY = (y0 + y1) / 2;
            if (label !== undefined) {
                drawLabel(label, labelX, labelY);
            }
        };

        const drawCenter = (center: Center, index: number) => {
            const label = options.centerLabels ? index : undefined;
            drawPoint(center.x, center.y, 'red', label);
        };

        const drawCorner = (corner: Corner, index: number) => {
            const label = options.cornerLabels ? index : undefined;
            drawPoint(corner.x, corner.y, 'blue', label);
        };

        const drawVoronoiEdge = (edge: Edge, index: number) => {
            const startCorner = gameMap.graphs.corners[edge.v0];
            const endCorner = gameMap.graphs.corners[edge.v1];
            const label = options.voronoiEdgeLabels ? index : undefined;
            drawLine(startCorner.x, startCorner.y, endCorner.x, endCorner.y, 'black', label);
        };

        const drawDelaunayEdge = (edge: Edge, index: number) => {
            if (edge.d1 < 0) {
                return;
            }
            const startCenter = gameMap.graphs.centers[edge.d0];
            const endCenter = gameMap.graphs.centers[edge.d1];
            const label = options.delaunayEdgeLabels ? index : undefined;
            drawLine(startCenter.x, startCenter.y, endCenter.x, endCenter.y, 'red', label);
        }

        const drawLabel = (text: string | number, x: number, y: number, xOffset = 0, yOffset = 0, edgePadding = 14) => {
            const xPos = clamp(x + xOffset, edgePadding, gameMap.width - edgePadding);
            const yPos = clamp(y + yOffset, edgePadding, gameMap.height - edgePadding);
            ctx.font = '13px Arial';
            ctx.strokeStyle = 'black';
            ctx.strokeText(String(text), xPos, yPos);
        };

        if (options.centers){
            gameMap.graphs.centers.forEach(drawCenter);
        }
        if (options.corners) {
            gameMap.graphs.corners.forEach(drawCorner);
        }
        if (options.voronoiEdges) {
            gameMap.graphs.edges.forEach(drawVoronoiEdge);
        }
        if (options.delaunayEdges) {
            gameMap.graphs.edges.forEach(drawDelaunayEdge);
        }
    }, [
        gameMap,
        options.centers,
        options.centerLabels,
        options.corners,
        options.cornerLabels,
        options.voronoiEdges,
        options.voronoiEdgeLabels,
        options.delaunayEdges,
        options.delaunayEdgeLabels
    ]);

    const canvasProps = {
        ref: canvasRef,
        width: gameMap.width,
        height: gameMap.height
    };

    return <canvas className="map-canvas" {...canvasProps} />
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}