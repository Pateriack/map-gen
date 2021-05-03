import { makeNoise2D } from 'fast-simplex-noise';
import { RandomNumberGenerator } from './random-number-generator';

export type NoiseFunction = (x: number, y: number) => number;

export const noiseMaker = (rng: RandomNumberGenerator, scale: number = 0.01): NoiseFunction => {
    const noise2D = makeNoise2D(() => rng.getNumber());
    return (x: number, y: number) => noise2D(x * scale, y * scale);
};