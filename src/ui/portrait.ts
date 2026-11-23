import type { ClosePersonId } from '../sim/relationships';
import type { CountryCode } from '../data/demographics';
import { countryRegion } from '../data/country-profiles';

const svgNamespace = 'http://www.w3.org/2000/svg';

const skinTones = {
  europe: ['#f1c7a8', '#d99a78', '#b87558', '#8f563f'],
  asia: ['#f0c39b', '#d69a70', '#b87550', '#855038'],
  africa: ['#9b6045', '#75412f', '#542f26', '#c17a58'],
  americas: ['#f0c09b', '#c98662', '#9d6248', '#6f4032'],
  oceania: ['#efbd96', '#c7805d', '#9a5d44', '#6c3e31'],
  'middle-east': ['#e7b384', '#c58259', '#985d42', '#70402f'],
} as const;

const hairTones = ['#211b25', '#3b2724', '#69412d', '#a16a3d'] as const;

function variant(id: ClosePersonId, country: CountryCode, seed: number): number {
  let hash = seed >>> 0;
  for (const character of `${id}:${country}`) hash = Math.imul(hash ^ character.charCodeAt(0), 0x45d9f3b);
  return (hash >>> 0) % 4;
}

export function portrait(id: ClosePersonId, country: CountryCode, seed = 0): SVGSVGElement {
  const svg = document.createElementNS(svgNamespace, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('portrait');

  const palettes = {
    caregiver: ['#b8d7cb', '#356c62'],
    friend: ['#ead0a8', '#a25c4a'],
    colleague: ['#c8c5e2', '#66598a'],
    neighbor: ['#c4d6e7', '#486a84'],
  } as const;
  const [backdrop, shirt] = palettes[id];
  const tone = variant(id, country, seed);
  const hair = hairTones[(tone + id.length) % hairTones.length];
  const skin = skinTones[countryRegion(country)][tone];
  const background = document.createElementNS(svgNamespace, 'rect');
  background.setAttribute('width', '16');
  background.setAttribute('height', '16');
  background.setAttribute('fill', backdrop);
  svg.append(background);

  const layers = [
    ['2,16 3,11 13,11 14,16', shirt],
    ['4,7 4,4 6,2 11,2 13,5 12,9 10,7 9,5 7,7', hair],
    ['5,6 7,6 8,5 9,6 11,6 11,10 9,12 7,12 5,10', skin],
    ['6,8 7,8 7,9 6,9 10,8 10,9 9,9 7,11 9,11', '#422a25'],
  ];
  for (const [points, color] of layers) {
    const shape = document.createElementNS(svgNamespace, 'polygon');
    shape.setAttribute('points', points!);
    shape.setAttribute('fill', color!);
    svg.append(shape);
  }
  return svg;
}
