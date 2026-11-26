export function element(document, tag, text, className) {
 const node = document.createElement(tag);
 if (text != null) node.textContent = text;
 if (className) node.className = className;
 return node;
}

export function statusRegion(document, initial = '') {
 const node = element(document, 'p', initial, 'nocturne-status');
 node.setAttribute('role', 'status');
 return node;
}

export function action(document, label, handler, primary = false) {
 const button = element(document, 'button', label, 'nocturne-button');
 button.type = 'button';
 if (primary) button.dataset.primary = '';
 button.addEventListener('click', handler);
 return button;
}

export function heading(document, label, title, supporting) {
 const header = element(document, 'header', null, 'nocturne-heading');
 const text = element(document, 'div');
 const actions = element(document, 'div', null, 'nocturne-actions');
 text.append(element(document, 'p', label, 'nocturne-label'), element(document, 'h2', title));
 if (supporting) text.append(element(document, 'p', supporting, 'nocturne-meta'));
 header.append(text, actions);
 return {header, actions};
}

export function metrics(document, label, rows) {
 const list = element(document, 'dl', null, 'nocturne-metrics');
 list.setAttribute('aria-label', label);
 for (const [name, value, detail] of rows) {
  const card = element(document, 'div', null, 'nocturne-metric');
  card.append(element(document, 'dt', name), element(document, 'dd', value));
  if (detail) card.append(element(document, 'small', detail));
  list.append(card);
 }
 return list;
}

export function breakdown(document, title, rows) {
 const section = element(document, 'section', null, 'nocturne-breakdown');
 const list = element(document, 'dl');
 section.append(element(document, 'h3', title), list);
 for (const [label, value, evidence] of rows) {
  const row = element(document, 'div');
  const title = element(document, 'dt', label);
  if (evidence) title.append(element(document, 'small', evidence));
  row.append(title, element(document, 'dd', value));
  list.append(row);
 }
 return section;
}
