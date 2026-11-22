export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className = '', ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.append(...children);
  return element;
}

export function button(label: string, click: () => void, style = '', id = ''): HTMLButtonElement {
  const element = el('button', style, label);
  element.type = 'button';
  if (id) element.id = id;
  element.addEventListener('click', click);
  return element;
}

export function panel(title: string, ...content: Node[]): HTMLElement {
  return el('section', 'panel', el('h2', '', title), ...content);
}

export function heading(title: string): HTMLHeadingElement {
  const element = el('h1', '', title);
  element.id = 'screen-title';
  element.tabIndex = -1;
  return element;
}

export function facts(entries: readonly (readonly [string, string | number])[]): HTMLElement {
  const list = el('dl', 'facts');
  for (const [key, value] of entries) {
    list.append(el('div', '', el('dt', '', key), el('dd', '', String(value))));
  }
  return list;
}
