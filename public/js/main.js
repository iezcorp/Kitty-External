// ---------------------------------------------------------------------------
// Kitty — shared client-side behavior: toasts, mobile nav, button loading.
// ---------------------------------------------------------------------------

(function () {
  'use strict';

  // ------------------------------ Toasts ------------------------------

  function showToast({ title, body = '', type = 'info', duration = 5000 }) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <span class="toast-dot"></span>
      <div>
        <div class="toast-title"></div>
        ${body ? '<div class="toast-body"></div>' : ''}
      </div>
    `;
    toast.querySelector('.toast-title').textContent = title;
    if (body) toast.querySelector('.toast-body').textContent = body;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    const remove = () => {
      toast.classList.remove('show');
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 350);
    };

    setTimeout(remove, duration);
    return remove;
  }

  window.KittyToast = showToast;

  // ------------------------------ Mobile nav ------------------------------

  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // ------------------------------ Button loading states ------------------------------
  // Any form or link with [data-loading-text] shows a spinner + disables
  // itself immediately on submit/click, preventing duplicate submissions.

  document.querySelectorAll('form[data-loading-text]').forEach((form) => {
    form.addEventListener('submit', () => {
      const btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.classList.add('is-loading');
        btn.setAttribute('aria-disabled', 'true');
        btn.disabled = true;
      }
    });
  });

  document.querySelectorAll('a[data-loading-text]').forEach((link) => {
    link.addEventListener('click', () => {
      link.classList.add('is-loading');
      link.setAttribute('aria-disabled', 'true');
    });
  });

  // ------------------------------ Query-param driven toasts ------------------------------
  // Pages can render a `data-toast` element (see partials) whose dataset
  // Claude/EJS fills in server-side; this picks it up and fires the toast once.

  document.querySelectorAll('[data-toast]').forEach((el) => {
    showToast({
      title: el.dataset.toastTitle,
      body: el.dataset.toastBody || '',
      type: el.dataset.toastType || 'info',
    });
    el.remove();
  });

  // ------------------------------ Query-param toasts ------------------------------
  // Simple success signals passed back after a redirect (e.g. ?created=1)
  // trigger a matching toast, then get scrubbed from the URL so a refresh
  // doesn't re-fire it.

  const queryToastMap = {
    created: { title: 'Update created', type: 'success' },
    edited: { title: 'Update saved', type: 'success' },
  };

  if (window.history && window.history.replaceState) {
    const url = new URL(window.location.href);
    let changed = false;
    Object.keys(queryToastMap).forEach((key) => {
      if (url.searchParams.get(key) === '1') {
        showToast(queryToastMap[key]);
      }
    });
    ['welcome', 'logout', 'created', 'edited'].forEach((key) => {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    });
    if (changed) window.history.replaceState({}, '', url.toString());
  }
})();
