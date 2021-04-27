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

        const drawCenter = (center: Center, index: number) => {
            ctx.beginPath();
            ctx.arc(center.x, center.y, 3, 0, 2 * Math.PI, false);
            ctx.fillStyle = 'red';
            ctx.fill();
            ctx.strokeText(index + "", center.x + 5, center.y + 10);
        };

        const drawCorner = (corner: Corner, index: number) => {
            ctx.beginPath();
            ctx.arc(corner.x, corner.y, 3, 0, 2 * Math.PI, false);
            ctx.fillStyle = 'blue';
            ctx.fill();
            ctx.strokeText(index + "", corner.x + 5, corner.y + 10);
        };

        const drawVoronoiEdge = (edge: Edge, index: number) => {
            ctx.beginPath();
            const startCorner = gameMap.graphs.corners[edge.v0];
            const endCorner = gameMap.graphs.corners[edge.v1];
            ctx.moveTo(startCorner.x, startCorner.y);
            ctx.lineTo(endCorner.x, endCorner.y);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.closePath();
            ctx.strokeText(index + "")
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