import socca from './socca.js';
import soccer from './soccer.js';
import futsal from './futsal.js';

export const SPORTS = { socca, soccer, futsal };

export function getSport(id) {
  return SPORTS[id] ?? null;
}
