// ---------------------------------------------------------------------------
// Kitty — Live Updates page real-time behavior.
// Subscribes to the SSE stream and pushes new/edited/removed update cards
// into the list without requiring a page refresh, plus a quiet toast.
// ---------------------------------------------------------------------------

(function () {
  const list = document.getElementById('update-list');
  if (!list || typeof EventSource === 'undefined') return;

  const source = new EventSource('/api/updates/stream');

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function buildCard(update) {
    const a = document.createElement('a');
    a.href = `/updates/${update.id}`;
    a.className = 'update-card';
    a.dataset.updateId = update.id;
    a.innerHTML = `
      <div class="update-card-top">
        <h3></h3>
        <span class="update-version-badge">v${escapeHtml(update.version)}</span>
      </div>
      <p class="desc"></p>
      <div class="update-meta">
        <span>${formatDate(update.publishedAt || update.createdAt)}</span>
        ${update.robloxVersion ? `<span>Roblox ${escapeHtml(update.robloxVersion)}</span>` : ''}
      </div>
    `;
    a.querySelector('h3').textContent = update.title;
    a.querySelector('.desc').textContent = update.shortDescription;
    return a;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function removeEmptyState() {
    const empty = document.getElementById('empty-state');
    if (empty) empty.remove();
  }

  source.addEventListener('update:published', (e) => {
    const update = JSON.parse(e.data);
    removeEmptyState();
    const card = buildCard(update);
    list.prepend(card);
    if (window.KittyToast) {
      window.KittyToast({ title: 'New Kitty Update', body: update.title, type: 'info' });
    }
  });

  source.addEventListener('update:edited', (e) => {
    const update = JSON.parse(e.data);
    const existing = list.querySelector(`[data-update-id="${update.id}"]`);
    const fresh = buildCard(update);
    if (existing) existing.replaceWith(fresh);
    else list.prepend(fresh);
  });

  source.addEventListener('update:unpublished', (e) => {
    const { id } = JSON.parse(e.data);
    const existing = list.querySelector(`[data-update-id="${id}"]`);
    if (existing) existing.remove();
  });

  source.addEventListener('update:deleted', (e) => {
    const { id } = JSON.parse(e.data);
    const existing = list.querySelector(`[data-update-id="${id}"]`);
    if (existing) existing.remove();
  });

  source.onerror = () => {
    // EventSource auto-reconnects; nothing to do here besides staying quiet.
  };
})();
