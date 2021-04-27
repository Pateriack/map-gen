import React, { useEffect, useRef } from 'react';
import { Center, Corner, Edge, GameMap, Point, Polygon } from './generator';
import './map-display.css';

interface MapDisplayProps {
    gameMap: GameMap;
}

export const MapDisplay: React.FC<MapDisplayProps> = ({
    gameMap
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
            drawPoint(center.x, center.y, 'red', index);
        };

        const drawCorner = (corner: Corner, index: number) => {
            drawPoint(corner.x, corner.y, 'blue', index);
        };

        const drawVoronoiEdge = (edge: Edge, index: number) => {
            const startCorner = gameMap.graphs.corners[edge.v0];
            const endCorner = gameMap.graphs.corners[edge.v1];
            drawLine(startCorner.x, startCorner.y, endCorner.x, endCorner.y, 'black', index);
        };

        const drawLabel = (text: string | number, x: number, y: number, xOffset = 0, yOffset = 0, edgePadding = 10) => {
            const xPos = clamp(x + xOffset, edgePadding, gameMap.width - edgePadding);
            const yPos = clamp(y + yOffset, edgePadding, gameMap.height - edgePadding);
            ctx.strokeText(String(text), xPos, yPos);
        };

        gameMap.graphs.centers.forEach(drawCenter);
        gameMap.graphs.corners.forEach(drawCorner);
        gameMap.graphs.edges.forEach(drawVoronoiEdge);
    }, [gameMap]);

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