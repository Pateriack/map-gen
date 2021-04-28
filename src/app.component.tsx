import React from 'react';

import './app.css';
import { generateMap, MapOptions } from './generator';
import { MapDisplay, MapDisplayOptions } from './map-display.component';

export const App: React.FC = () => {
  const mapOptions: MapOptions = {
    width: 600,
    height: 600,
    numPolygons: 300,
    pointRelaxationIterations: 3,
    cornerRelaxationIterations: 1,
    // seed: 'butts'
  };

  const gameMap = generateMap(mapOptions);

  const displayOptions: MapDisplayOptions = {
    centers: false,
    centerLabels: false,
    corners: false,
    cornerLabels: false,
    voronoiEdges: true,
    voronoiEdgeLabels: false,
    delaunayEdges: false,
    delaunayEdgeLabels: false,
    polygons: true
  };

  return <div id="container">
    <MapDisplay gameMap={gameMap} options={displayOptions} />
  </div>
}
