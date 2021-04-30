import { Checkbox, FormControlLabel, FormGroup, makeStyles, Typography } from '@material-ui/core';
import React from 'react';

import { MapDisplayOptions } from './map-display.component';

const useStyles = makeStyles(theme => {
    
});

export interface MapDisplayFormProps {
    mapDisplayOptions: MapDisplayOptions;
    onChange: (changed: Partial<MapDisplayOptions>) => void;
}

export const MapDisplayForm: React.FC<MapDisplayFormProps> = ({
    mapDisplayOptions,
    onChange
}) => {

    return (
        <React.Fragment>
            <Typography variant="h6" gutterBottom>Display</Typography>
            <form>
                <FormGroup row>
                    <FormControlLabel
                        control={<Checkbox name='centers' checked={mapDisplayOptions.centers} onChange={e => onChange({ centers: e.target.checked })} />}
                        label="Show Centers"
                    />
                </FormGroup>
                <FormGroup row>
                    <FormControlLabel
                        control={<Checkbox name='corners' checked={mapDisplayOptions.corners} onChange={e => onChange({ corners: e.target.checked })} />}
                        label="Show Corners"
                    />
                </FormGroup>
                <FormGroup row>
                    <FormControlLabel
                        control={<Checkbox name='delaunayEdges' checked={mapDisplayOptions.delaunayEdges} onChange={e => onChange({ delaunayEdges: e.target.checked })} />}
                        label="Show Adjacency Graph Edges"
                    />
                </FormGroup>
                <FormGroup row>
                    <FormControlLabel
                        control={<Checkbox name='voronoiEdges' checked={mapDisplayOptions.voronoiEdges} onChange={e => onChange({ voronoiEdges: e.target.checked })} />}
                        label="Show Polygon Edges"
                    />
                </FormGroup>
                <FormGroup row>
                    <FormControlLabel
                        control={<Checkbox name='polygons' checked={mapDisplayOptions.polygons} onChange={e => onChange({ polygons: e.target.checked })} />}
                        label="Fill Polygons"
                    />
                </FormGroup>
            </form>
        </React.Fragment>
    )
};