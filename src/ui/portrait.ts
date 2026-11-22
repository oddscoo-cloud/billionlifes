import type { ClosePersonId } from '../sim/relationships';

const svgNamespace = 'http://www.w3.org/2000/svg';

export function portrait(id: ClosePersonId): SVGSVGElement {
  const svg = document.createElementNS(svgNamespace, 'svg');
  svg.setAttribute('viewBox', '0 0 56 56');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('portrait');

  const palettes = {
    caregiver: ['#bddacc', '#356c62', '#425854', '#d69571'],
    friend: ['#ead0a8', '#a25c4a', '#382c37', '#bd795b'],
    colleague: ['#c8c5e2', '#66598a', '#403246', '#ce9173'],
    neighbor: ['#c4d6e7', '#486a84', '#3f3838', '#b87855'],
  } as const;
  const [backdrop, shirt, hair, skin] = palettes[id];
  const background = document.createElementNS(svgNamespace, 'rect');
  background.setAttribute('width', '56');
  background.setAttribute('height', '56');
  background.setAttribute('rx', '14');
  background.setAttribute('fill', backdrop);
  svg.append(background);

  const layers = [
    ['M8 56c1-11 9-17 20-17s19 6 20 17z', shirt],
    ['M15 28V23c0-9 5-15 13-15s14 6 14 15v7z', hair],
    ['M18 23c5 0 9-2 12-6 2 4 5 6 8 7v4c0 7-4 12-10 12s-10-5-10-12z', skin],
    ['M22 27h2v2h-2zm10 0h2v2h-2zm-7 6h6l-3 2z', '#422a25'],
  ];
  for (const [outline, color] of layers) {
    const path = document.createElementNS(svgNamespace, 'path');
    path.setAttribute('d', outline!);
    path.setAttribute('fill', color!);
    svg.append(path);
  }
  return svg;
}
