import { makeNoise2D } from 'fast-simplex-noise';
import { RandomNumberGenerator } from './random-number-generator';

export const noiseMaker = (rng: RandomNumberGenerator, scale: number = 0.01) => {
    const noise2D = makeNoise2D(() => rng.getNumber());
    return (x: number, y: number) => noise2D(x * scale, y * scale);
};