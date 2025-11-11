const API_ENDPOINT = window.DASHBOARD_API || 'http://localhost:5000/api/pessoas';

let data = [];
let providerOrder = [];

const providerColorCache = new Map([
  ['Claro', '#38bdf8'],
  ['Oi', '#fb923c'],
  ['Tim', '#a855f7'],
  ['Vivo', '#34d399'],
  ['Não usa internet', '#f87171'],
  ['Não informado', '#94a3b8']
]);

const cityFilterEl = document.getElementById('cityFilter');
const providerFilterEl = document.getElementById('providerFilter');
const clearBtnEl = document.getElementById('clearFilters');
const resultsListEl = document.getElementById('resultsList');
const resultsCountEl = document.getElementById('resultsCount');
const totalCountEl = document.getElementById('totalCount');
const chartVisualEl = document.getElementById('chartVisual');
const chartLegendEl = document.getElementById('providerLegend');
const highlightsEl = document.getElementById('highlights');
const feedbackEl = document.getElementById('dashboardFeedback');

init();

async function init() {
  attachEvents();
  setFiltersDisabled(true);
  showProgress('Carregando dados do servidor...');

  try {
    data = await loadData();

    if (!data.length) {
      providerOrder = [];
      renderSummary([]);
      renderNoData('Nenhum registro foi encontrado no banco de dados.');
      showFeedback('info', 'Nenhum registro encontrado no banco de dados.');
      return;
    }

    providerOrder = buildProviderOrder(data);
    populateCityFilter(data);
    populateProviderFilter(providerOrder);
    setFiltersDisabled(false);
    updateDashboard();
    showFeedback('success', `Carregamos ${data.length} registro${data.length > 1 ? 's' : ''} do banco.`);
  } catch (error) {
    console.error('Falha ao carregar dados do MongoDB', error);
    renderSummary([]);
    renderNoData('Erro ao buscar dados. Verifique a conexão com o banco e recarregue a página.');
    showFeedback('error', `Não foi possível carregar os dados (${error.message}).`);
  }
}

function attachEvents() {
  cityFilterEl.addEventListener('change', updateDashboard);
  providerFilterEl.addEventListener('change', updateDashboard);
  clearBtnEl.addEventListener('click', () => {
    cityFilterEl.value = 'todos';
    providerFilterEl.value = 'todos';
    updateDashboard();
  });
}

async function loadData() {
  const response = await fetch(API_ENDPOINT, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Status ${response.status}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.data)) {
    return [];
  }

  return payload.data.map(normalizeRecord);
}

function normalizeRecord(record) {
  const nome = sanitizeString(record.nome || record.name) || 'Nome não informado';
  const cidade = sanitizeString(record.cidade || record.city) || 'Cidade não informada';
  const provedora = sanitizeString(
    record.provedora || record.provedor || record.provider || record.provedoraInternet
  ) || 'Não informado';
  const plano = sanitizeString(record.plano || record.planoInternet || record.planoContratado) || '—';
  const contato = sanitizeString(record.contato || record.email || record.telefone || record.phone) || '—';
  const atualizadoEm = formatToIso(
    record.atualizadoEm || record.updatedAt || record.criadoEm || record.createdAt || record.dataAtualizacao
  );

  return {
    id: record.id || record._id || null,
    nome,
    cidade,
    provedora,
    plano,
    contato,
    atualizadoEm,
    original: record
  };
}

function formatToIso(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function populateCityFilter(records) {
  const cities = Array.from(new Set(records.map(item => item.cidade).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

  cityFilterEl.innerHTML = '<option value="todos">Todas</option>';

  cities.forEach(city => {
    const option = document.createElement('option');
    option.value = city;
    option.textContent = city;
    cityFilterEl.appendChild(option);
  });
}

function populateProviderFilter(providers) {
  providerFilterEl.innerHTML = '<option value="todos">Todas</option>';

  providers.forEach(provider => {
    const option = document.createElement('option');
    option.value = provider;
    option.textContent = provider;
    providerFilterEl.appendChild(option);
  });
}

function updateDashboard() {
  if (!data.length) {
    renderNoData('Nenhum dado disponível.');
    return;
  }

  const selectedCity = cityFilterEl.value;
  const selectedProvider = providerFilterEl.value;
  const filtered = filterData(selectedCity, selectedProvider);

  renderResults(filtered);
  renderSummary(filtered);
  renderChart(filtered);
}

function filterData(city, provider) {
  return data.filter(item => {
    const matchCity = city === 'todos' || item.cidade === city;
    const matchProvider = provider === 'todos' || item.provedora === provider;
    return matchCity && matchProvider;
  });
}

function renderResults(list) {
  resultsListEl.innerHTML = '';

  if (!list.length) {
    resultsListEl.innerHTML = '<div class="empty-state">Nenhum registro encontrado com os filtros selecionados.</div>';
    resultsCountEl.textContent = '0 resultados';
    return;
  }

  const fragment = document.createDocumentFragment();

  list.forEach(person => {
    const card = document.createElement('article');
    card.className = 'person-card';

    const header = document.createElement('div');
    header.className = 'person-header';

    const name = document.createElement('span');
    name.className = 'person-name';
    name.textContent = person.nome;

    const providerTag = document.createElement('span');
    providerTag.className = providerClassName(person.provedora);
    providerTag.textContent = person.provedora;

    header.append(name, providerTag);

    const info = document.createElement('div');
    info.className = 'person-info';

    const infoRows = [
      { label: 'Cidade', value: person.cidade },
      { label: 'Plano', value: person.plano },
      { label: 'Contato', value: person.contato },
      { label: 'Atualizado em', value: formatDate(person.atualizadoEm) }
    ];

    infoRows.forEach(row => {
      const span = document.createElement('span');
      const strong = document.createElement('strong');
      strong.textContent = `${row.label}:`;
      span.append(strong, document.createTextNode(row.value ? ` ${row.value}` : ' —'));
      info.appendChild(span);
    });

    card.append(header, info);
    fragment.appendChild(card);
  });

  resultsListEl.appendChild(fragment);
  resultsCountEl.textContent = `${list.length} resultado${list.length > 1 ? 's' : ''}`;
}

function providerClassName(name) {
  if (name === 'Não usa internet') {
    return 'person-provider none';
  }
  if (name === 'Não informado') {
    return 'person-provider neutral';
  }
  return 'person-provider';
}

function renderSummary(list) {
  const totalRegistros = list.length;
  const totalBase = data.length;
  const cidadesAtivas = new Set(list.map(item => item.cidade).filter(Boolean)).size;
  const providerHighlight = getTopProvider(list);

  const cards = [
    {
      label: 'Registros visíveis',
      value: totalRegistros,
      detail: `${totalBase} no total`
    },
    {
      label: 'Cidades filtradas',
      value: cidadesAtivas,
      detail: cidadesAtivas === 1 ? '1 cidade' : `${cidadesAtivas} cidades`
    },
    {
      label: 'Provedora em destaque',
      value: providerHighlight || '—',
      detail: providerHighlight ? 'Maior ocorrência nos filtros' : 'Nenhum dado no filtro atual'
    }
  ];

  highlightsEl.innerHTML = cards.map(card => `
    <div class="highlight-card">
      <span class="label">${card.label}</span>
      <span class="value">${card.value}</span>
      <span class="detail">${card.detail}</span>
    </div>
  `).join('');

  totalCountEl.textContent = `${totalRegistros} registro${totalRegistros === 1 ? '' : 's'} visíveis`;
}

function renderChart(list) {
  chartVisualEl.innerHTML = '';
  chartLegendEl.innerHTML = '';

  const total = list.length;
  if (total === 0) {
    chartVisualEl.innerHTML = '<div class="chart-empty">Nenhum dado disponível para montar o gráfico.</div>';
    return;
  }

  const counts = list.reduce((acc, item) => {
    const key = item.provedora || 'Não informado';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const providers = providerOrder.filter(provider => counts[provider] > 0);

  if (!providers.length) {
    chartVisualEl.innerHTML = '<div class="chart-empty">Sem dados para exibir.</div>';
    return;
  }

  const donut = createDonut(counts, total, providers);
  chartVisualEl.appendChild(donut);
  renderLegend(counts, total, providers);
}

function renderLegend(counts, total, providers) {
  const fragment = document.createDocumentFragment();

  providers.forEach(provider => {
    const count = counts[provider];
    if (!count) {
      return;
    }

    const item = document.createElement('div');
    item.className = 'chart-legend-item';

    const dot = document.createElement('span');
    dot.className = 'chart-legend-dot';
    dot.style.background = getProviderColor(provider);

    const info = document.createElement('div');
    info.className = 'chart-legend-info';

    const label = document.createElement('span');
    label.className = 'chart-legend-label';
    label.textContent = provider;

    const value = document.createElement('span');
    value.className = 'chart-legend-value';
    value.textContent = `${count} • ${Math.round((count / total) * 100)}%`;

    info.append(label, value);
    item.append(dot, info);
    fragment.appendChild(item);
  });

  chartLegendEl.appendChild(fragment);
}

function createDonut(counts, total, providers) {
  const svg = createSvgElement('svg');
  svg.setAttribute('viewBox', '0 0 220 220');
  svg.setAttribute('class', 'donut');

  const radius = 90;
  const center = 110;
  const strokeWidth = 26;

  const baseCircle = createSvgElement('circle');
  baseCircle.setAttribute('cx', center);
  baseCircle.setAttribute('cy', center);
  baseCircle.setAttribute('r', radius);
  baseCircle.setAttribute('fill', 'none');
  baseCircle.setAttribute('stroke', 'rgba(148, 163, 184, 0.18)');
  baseCircle.setAttribute('stroke-width', strokeWidth);
  svg.appendChild(baseCircle);

  let currentAngle = -90;

  providers.forEach(provider => {
    const value = counts[provider];
    if (!value) {
      return;
    }

    const sweep = (value / total) * 360;
    const color = getProviderColor(provider);

    if (sweep >= 359.999) {
      const fullCircle = createSvgElement('circle');
      fullCircle.setAttribute('cx', center);
      fullCircle.setAttribute('cy', center);
      fullCircle.setAttribute('r', radius);
      fullCircle.setAttribute('fill', 'none');
      fullCircle.setAttribute('stroke', color);
      fullCircle.setAttribute('stroke-width', strokeWidth);
      fullCircle.setAttribute('stroke-linecap', 'round');
      svg.appendChild(fullCircle);
      currentAngle += sweep;
      return;
    }

    const path = createSvgElement('path');
    path.setAttribute('d', describeArc(center, center, radius, currentAngle, currentAngle + sweep));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', strokeWidth);
    path.setAttribute('stroke-linecap', 'round');
    svg.appendChild(path);

    currentAngle += sweep;
  });

  const totalText = createSvgElement('text');
  totalText.setAttribute('x', center);
  totalText.setAttribute('y', center - 4);
  totalText.setAttribute('class', 'donut-total');
  totalText.textContent = total;

  const subtitle = createSvgElement('text');
  subtitle.setAttribute('x', center);
  subtitle.setAttribute('y', center + 18);
  subtitle.setAttribute('class', 'donut-subtitle');
  subtitle.textContent = 'registros';

  svg.append(totalText, subtitle);

  return svg;
}

function createSvgElement(tag) {
  return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

// Constrói o path SVG que representa o arco entre os ângulos informados.
function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians)
  };
}

function getTopProvider(list) {
  if (!list.length) {
    return '';
  }

  const tally = list.reduce((acc, item) => {
    const name = item.provedora;
    if (!name || name === 'Não informado') {
      return acc;
    }
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  const ordered = Object.entries(tally).sort(([, aCount], [, bCount]) => bCount - aCount);
  return ordered[0]?.[0] || '';
}

function formatDate(dateString) {
  if (!dateString) {
    return '—';
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function sanitizeString(value) {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function showProgress(message) {
  showFeedback('info', message);
  resultsListEl.innerHTML = `<div class="empty-state">${message}</div>`;
  chartVisualEl.innerHTML = '<div class="chart-empty">Carregando dados...</div>';
  chartLegendEl.innerHTML = '';
}

function renderNoData(message) {
  resultsListEl.innerHTML = `<div class="empty-state">${message}</div>`;
  resultsCountEl.textContent = '0 resultados';
  chartVisualEl.innerHTML = '<div class="chart-empty">Sem dados para exibir.</div>';
  chartLegendEl.innerHTML = '';
}

function showFeedback(type, message) {
  if (!feedbackEl) {
    return;
  }

  feedbackEl.textContent = message;
  feedbackEl.className = `feedback ${type}`;
  feedbackEl.classList.remove('hidden');
}

function setFiltersDisabled(disabled) {
  cityFilterEl.disabled = disabled;
  providerFilterEl.disabled = disabled;
  clearBtnEl.disabled = disabled;
}

function buildProviderOrder(records) {
  const known = ['Claro', 'Oi', 'Tim', 'Vivo', 'Não usa internet', 'Não informado'];
  const existing = new Set(records.map(item => item.provedora).filter(Boolean));

  const orderedKnown = known.filter(name => existing.has(name));
  const remaining = Array.from(existing)
    .filter(name => !orderedKnown.includes(name))
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

  return [...orderedKnown, ...remaining];
}

function getProviderColor(provider) {
  if (providerColorCache.has(provider)) {
    return providerColorCache.get(provider);
  }
  const color = hashToColor(provider);
  providerColorCache.set(provider, color);
  return color;
}

// Gera uma cor de fallback baseada em hash para provedores desconhecidos.
function hashToColor(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}
