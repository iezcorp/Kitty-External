// ---------------------------------------------------------------------------
// Kitty admin — row-level actions on the Updates manager table.
// ---------------------------------------------------------------------------

(function () {
  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const row = document.querySelector(`tr[data-row-id="${id}"]`);

      if (action === 'delete') {
        const confirmed = window.confirm('Delete this update permanently? This cannot be undone.');
        if (!confirmed) return;
      }

      const originalLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent =
        action === 'publish' ? 'Publishing...' : action === 'unpublish' ? 'Unpublishing...' : 'Deleting...';

      try {
        const res = await fetch(`/admin/updates/${id}/${action}`, { method: 'POST' });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Action failed');
        }

        if (action === 'delete') {
          row?.remove();
          window.KittyToast?.({ title: 'Update deleted', type: 'success' });
        } else {
          window.KittyToast?.({
            title: action === 'publish' ? 'Update published' : 'Update unpublished',
            type: 'success',
          });
          setTimeout(() => window.location.reload(), 500);
        }
      } catch (err) {
        window.KittyToast?.({ title: 'Something went wrong', body: err.message, type: 'error' });
        btn.disabled = false;
        btn.textContent = originalLabel;
      }
    });
  });
})();
