import React, { useEffect, useRef } from 'react';
import { GameMap, Point } from './generator';
import './map-display.css';

interface MapDisplayProps {
    gameMap: GameMap;
}

export const MapDisplay: React.FC<MapDisplayProps> = ({
    gameMap
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        console.log(gameMap);

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        const drawCenterPoint = ([x, y]: Point) => {
            context.beginPath();
            context.arc(x, y, 3, 0, 2 * Math.PI, false);
            context.fillStyle = 'black';
            context.fill();
        };

        gameMap.centerPoints.forEach(drawCenterPoint);
    }, [gameMap]);

    const canvasProps = {
        ref: canvasRef,
        width: gameMap.width,
        height: gameMap.height
    };

    return <canvas className="map-canvas" {...canvasProps} />
}