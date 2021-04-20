import React, { useEffect, useRef } from 'react';
import { GameMap, Point, Polygon } from './generator';
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

        const drawCenterPoint = ([x, y]: Point) => {
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI, false);
            ctx.fillStyle = 'red';
            ctx.fill();
        };

        const drawPolygon = (polygon: Polygon) => {
            ctx.beginPath();
            const [initialX, initialY] = polygon[polygon.length - 1];
            ctx.moveTo(initialX, initialY);
            polygon.forEach(polygon => ctx.lineTo(polygon[0], polygon[1]));
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.closePath();
        };

        gameMap.points.forEach(drawCenterPoint);
        gameMap.voronoiPolygons.forEach(drawPolygon);
    }, [gameMap]);

    const canvasProps = {
        ref: canvasRef,
        width: gameMap.width,
        height: gameMap.height
    };

    return <canvas className="map-canvas" {...canvasProps} />
}