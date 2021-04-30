import { createStyles, makeStyles, TextField, Typography } from '@material-ui/core';
import React from 'react';
import { MapOptions } from './generator';


export interface MapOptionsFormProps {
    mapOptions: MapOptions;
    onChange?: (changed: Partial<MapOptions>) => void;
}

const useStyles = makeStyles(theme =>
  createStyles({
    form: {
      '& > *': {
        marginTop: theme.spacing(),
        marginBottom: theme.spacing()
      },
    }
  }),
);

export const MapOptionsForm: React.FC<MapOptionsFormProps> = ({
    mapOptions,
    onChange
}) => {
    const classes = useStyles();

    return (
        <React.Fragment>
            <Typography variant="h6" gutterBottom>Map Options</Typography>
            <form className={classes.form}>
                <TextField label="Width" type='number' value={mapOptions.width} fullWidth />
                <TextField label="Height" type='number' value={mapOptions.height} fullWidth />
                <TextField label="Number of Polygons" type='number' value={mapOptions.numPolygons} fullWidth />
            </form>
        </React.Fragment>
    )
};