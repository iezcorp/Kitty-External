// ---------------------------------------------------------------------------
// Kitty admin — row-level actions on the Users manager table.
// ---------------------------------------------------------------------------

(function () {
  document.querySelectorAll('[data-user-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.userAction;
      const id = btn.dataset.id;
      const row = document.querySelector(`tr[data-row-id="${id}"]`);

      let confirmMsg = null;
      if (action === 'delete') confirmMsg = 'Permanently delete this user account? This cannot be undone.';
      if (action === 'disable') confirmMsg = 'Disable this account? The user will no longer be able to use Kitty.';

      if (confirmMsg && !window.confirm(confirmMsg)) return;

      const originalLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = action === 'delete' ? 'Deleting...' : action === 'disable' ? 'Disabling...' : 'Enabling...';

      try {
        const res = await fetch(`/admin/users/${id}/${action}`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Action failed');

        if (action === 'delete') {
          row?.remove();
          window.KittyToast?.({ title: 'User deleted', type: 'success' });
        } else {
          window.KittyToast?.({
            title: action === 'disable' ? 'Account disabled' : 'Account enabled',
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
