import { Button, createStyles, makeStyles, TextField, Typography } from '@material-ui/core';
import React from 'react';
import { MapOptions } from './generator';


export interface MapOptionsFormProps {
    mapOptions: MapOptions;
    onChange: (changed: Partial<MapOptions>) => void;
    onRegenerate: () => void;
    onRandomizeSeed: () => void;
}

const useStyles = makeStyles(theme =>
  createStyles({
    form: {
      '& > *': {
        marginTop: theme.spacing(),
        marginBottom: theme.spacing()
      },
    },
    button: {
      marginRight: theme.spacing()
    }
  }),
);

export const MapOptionsForm: React.FC<MapOptionsFormProps> = ({
    mapOptions,
    onChange,
    onRegenerate,
    onRandomizeSeed
}) => {
    const classes = useStyles();

    return (
        <React.Fragment>
            <Typography variant='h6' gutterBottom>Map Generation</Typography>
            <form className={classes.form}>
                <TextField
                  label='Number of Polygons'
                  type='number'
                  value={mapOptions.numPolygons}
                  fullWidth
                  onChange={e => onChange({ numPolygons: parseInt(e.target.value) })}
                />
                <TextField
                  label='Center Relaxation Iterations'
                  type='number'
                  value={mapOptions.pointRelaxationIterations}
                  fullWidth
                  onChange={e => onChange({ pointRelaxationIterations: parseInt(e.target.value) })}
                />
                <TextField
                  label='Corner Relaxation Iterations'
                  type='number'
                  value={mapOptions.cornerRelaxationIterations}
                  fullWidth
                  onChange={e => onChange({ cornerRelaxationIterations: parseInt(e.target.value) })}
                />
                <TextField
                  label='Seed'
                  value={mapOptions.seed}
                  fullWidth
                  onChange={e => onChange({ seed: e.target.value })}
                />
                <Button
                  className={classes.button}
                  variant='contained'
                  color='primary'
                  onClick={onRegenerate}
                >Regenerate</Button>
                <Button
                  className={classes.button}
                  variant='contained'
                  color='primary'
                  onClick={onRandomizeSeed}
                >Random Seed</Button>
            </form>
        </React.Fragment>
    )
};