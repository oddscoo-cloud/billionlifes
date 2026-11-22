import type { ClosePersonId } from '../sim/relationships';

const svgNamespace = 'http://www.w3.org/2000/svg';

export function portrait(id: ClosePersonId): SVGSVGElement {
  const svg = document.createElementNS(svgNamespace, 'svg');
  svg.setAttribute('viewBox', '0 0 56 56');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('portrait');

  const caregiver = id === 'caregiver';
  const background = document.createElementNS(svgNamespace, 'rect');
  background.setAttribute('width', '56');
  background.setAttribute('height', '56');
  background.setAttribute('rx', '14');
  background.setAttribute('fill', caregiver ? '#bbdabc' : '#f3d099');
  svg.append(background);

  const layers = [
    ['M8 56c1-11 9-17 20-17s19 6 20 17z', caregiver ? '#356c62' : '#a25c4a'],
    ['M15 28V23c0-9 5-15 13-15s14 6 14 15v7z', caregiver ? '#425854' : '#382c37'],
    ['M18 23c5 0 9-2 12-6 2 4 5 6 8 7v4c0 7-4 12-10 12s-10-5-10-12z', caregiver ? '#d69571' : '#bd795b'],
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
