const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

async function loadApiDocs() {
  const endpoints = document.querySelector('#docs-endpoints');
  try {
    const response = await fetch('/api/docs', { headers: { Accept: 'application/json' } });
    const docs = await response.json();
    if (!response.ok) throw new Error(docs.error || 'Could not load API reference');

    document.querySelector('#docs-title').textContent = docs.title || 'API Documentation';
    document.querySelector('#docs-note').textContent = docs.note || 'Endpoint reference for the Vantage Screener API.';
    document.querySelector('#docs-base').textContent = docs.basePath || '/api';
    endpoints.innerHTML = (docs.endpoints || []).map(endpoint => `
      <article class="panel endpoint-card">
        <div class="endpoint-heading"><span class="method-badge">${escapeHtml(endpoint.method)}</span><code>${escapeHtml(endpoint.path)}</code></div>
        <p class="endpoint-description">${escapeHtml(endpoint.description)}</p>
        ${endpoint.query ? `<div class="endpoint-section"><h2>QUERY PARAMETERS</h2><dl class="parameter-list">${Object.entries(endpoint.query).map(([name, description]) => `<div><dt><code>${escapeHtml(name)}</code></dt><dd>${escapeHtml(description)}</dd></div>`).join('')}</dl></div>` : ''}
        ${endpoint.response ? `<div class="endpoint-section"><h2>RESPONSE</h2><pre><code>${escapeHtml(endpoint.response)}</code></pre></div>` : ''}
      </article>`).join('') || '<div class="panel docs-loading">No endpoints are listed.</div>';

    document.querySelector('#docs-providers').innerHTML = (docs.upstream || []).map(source => `
      <article class="provider-card"><h3>${escapeHtml(source.provider)}</h3><p>${escapeHtml(source.purpose)}</p>${source.url ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.url)}</a>` : `<code>${escapeHtml(source.urlPattern || '')}</code>`}</article>`).join('') || '<p class="subtitle">No upstream providers listed.</p>';
  } catch (error) {
    endpoints.innerHTML = '';
    document.querySelector('#docs-error').textContent = `API docs could not be loaded: ${error.message}`;
  }
}

loadApiDocs();
