import { AppBar, Container, Grid, makeStyles, Toolbar, Typography } from '@material-ui/core';
import words from 'random-words';
import React, { useState } from 'react';

import { GameMap, generateMap, MapOptions } from './generator';
import { MapDisplayForm } from './map-display-form.component';
import { MapOptionsForm } from './map-options-form.component';
import { MapDisplay, MapDisplayOptions } from './map-display.component';

const useStyles = makeStyles(theme => ({
  container: {
    marginTop: theme.spacing(4)
  }
}));

const getRandomSeed = () => words({ exactly: 3, join: '-' });

const initialDisplayOptions: MapDisplayOptions = {
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

const initialMapOptions: MapOptions = {
  width: 600,
  height: 600,
  numPolygons: 300,
  pointRelaxationIterations: 3,
  cornerRelaxationIterations: 1,
  seed: getRandomSeed()
};

export const App: React.FC = () => {
  const classes = useStyles();

  const [mapDisplayOptions, setMapDisplayOptions] = useState<MapDisplayOptions>(initialDisplayOptions);

  const [mapOptions, setMapOptions] = useState<MapOptions>(initialMapOptions);

  const [gameMap, setGameMap] = useState<GameMap>(generateMap(mapOptions));

  const handleMapDisplayOptionsChange = (updatedOptions: Partial<MapDisplayOptions>) => {
    setMapDisplayOptions({
      ...mapDisplayOptions,
      ...updatedOptions
    });
  };

  const handleMapOptionsChange = (updatedOptions: Partial<MapOptions>) => {
    setMapOptions({
      ...mapOptions,
      ...updatedOptions
    });
  };

  const handleRegenerate = () => {
    setGameMap(generateMap(mapOptions));
  };

  const handleRandomizeSeed = () => {
    const newMapOptions: MapOptions = {
      ...mapOptions,
      seed: getRandomSeed()
    };
    setMapOptions(newMapOptions);
    setGameMap(generateMap(newMapOptions));
  };

  return <React.Fragment>
    <AppBar position="static">
      <Toolbar variant='dense'>
        <Typography variant="h6">
          Polygon Map Generator
        </Typography>
      </Toolbar>
    </AppBar>
    <Container className={classes.container}>
      <Grid container spacing={2}>
        <Grid item sm={12} md={4}>
          <MapDisplayForm
            mapDisplayOptions={mapDisplayOptions}
            onChange={handleMapDisplayOptionsChange}
          />
          <MapOptionsForm
            mapOptions={mapOptions}
            onChange={handleMapOptionsChange}
            onRandomizeSeed={handleRandomizeSeed}
            onRegenerate={handleRegenerate}
          />
        </Grid>
        <Grid item sm={12} md={8}>
          <MapDisplay gameMap={gameMap} options={mapDisplayOptions} />
        </Grid>
      </Grid>
    </Container>
  </React.Fragment>
}
