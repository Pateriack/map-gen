import React from 'react';

import './app.css';
import { generateMap, MapOptions } from './generator';
import { MapDisplay } from './map-display.component';

export const App: React.FC = () => {
  const mapOptions: MapOptions = {
    width: 600,
    height: 600,
    numPolygons: 3,
    relaxationIterations: 2
  };

  const gameMap = generateMap(mapOptions);

  return <div id="container">
    <MapDisplay gameMap={gameMap} />
  </div>
}
