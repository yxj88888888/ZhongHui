const state = { user: null, capabilities: {}, prices: [], updatedAt: '--', users: [] };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function setMessage(selector, message, isError = true) {
  const node = $(selector);
  if (!node) return;
  node.textContent = message || '';
  node.style.color = isError ? 'var(--admin-red)' : 'var(--admin-gold-bright)';
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({ code: 0, msg: '服务器响应无效' }));
  if (response.status === 401) {
    showLogin();
    throw new Error(payload.msg || '登录状态已失效');
  }
  if (!response.ok || payload.code !== 1) throw new Error(payload.msg || '操作失败');
  return payload.data;
}

function showLogin() {
  $('#admin-login')?.classList.remove('is-hidden');
  $('#force-password-change')?.classList.add('is-hidden');
  $('#admin-app')?.classList.add('is-hidden');
}

function showPasswordChange() {
  $('#admin-login')?.classList.add('is-hidden');
  $('#force-password-change')?.classList.remove('is-hidden');
  $('#admin-app')?.classList.add('is-hidden');
}

function showApp() {
  $('#admin-login')?.classList.add('is-hidden');
  $('#force-password-change')?.classList.add('is-hidden');
  $('#admin-app')?.classList.remove('is-hidden');
  $('#session-user').textContent = state.user.username + ' · ' + ({ admin: '管理员', manager: '店长', clerk: '店员' }[state.user.role] || state.user.role);
  $('#user-nav')?.classList.toggle('is-hidden', !state.capabilities['users:write']);
  $('#audit-nav')?.classList.toggle('is-hidden', !state.capabilities['audit:read']);
}

function showPanel(panelId) {
  $$('.admin-panel').forEach((panel) => panel.classList.toggle('is-hidden', panel.id !== panelId));
  $$('.admin-nav button').forEach((button) => button.classList.toggle('is-active', button.dataset.panel === panelId));
}

function renderPrices() {
  const map = new Map(state.prices.map((price) => [price.id, price]));
  $$('[data-price-id]').forEach((row) => {
    const price = map.get(row.dataset.priceId);
    if (!price) return;
    row.querySelector('[data-price-field="sell"]').value = price.sell_price;
    row.querySelector('[data-price-field="recycle"]').value = price.recycle_price;
  });
  $('#price-updated').textContent = state.updatedAt || '--';
  const canWrite = state.capabilities['prices:write'] === true;
  $$('#price-form input, #price-form button').forEach((field) => { field.disabled = !canWrite; });
}

async function loadPrices() {
  const data = await api('/api/admin/prices');
  state.prices = data.prices || [];
  state.updatedAt = data.update_time || '--';
  renderPrices();
}

function renderUsers() {
  const list = $('#user-list');
  if (!list) return;
  list.innerHTML = state.users.map((user) => (
    '<div class="list-item">' +
      '<div class="list-item-main"><strong>' + user.username + '</strong><small>' +
      ({ admin: '管理员', manager: '店长', clerk: '店员' }[user.role] || user.role) +
      ' · ' + (user.active ? '已启用' : '已停用') + '</small></div>' +
      '<div class="list-item-actions">' +
      '<button data-user-action="toggle" data-user-id="' + user.id + '">' + (user.active ? '停用' : '启用') + '</button>' +
      '<button data-user-action="reset" data-user-id="' + user.id + '">重置密码</button>' +
      (user.id === 'admin' ? '' : '<button class="danger" data-user-action="delete" data-user-id="' + user.id + '">删除</button>') +
      '</div>' +
    '</div>'
  )).join('') || '<p class="admin-muted">暂无账号</p>';
}

async function loadUsers() {
  if (!state.capabilities['users:write']) return;
  state.users = await api('/api/admin/users');
  renderUsers();
}

async function loadAudit() {
  if (!state.capabilities['audit:read']) return;
  const entries = await api('/api/admin/audit');
  const list = $('#audit-list');
  list.innerHTML = entries.map((entry) => (
    '<div class="list-item audit-item"><div><strong>' + entry.action + '</strong><small>' +
    (entry.username || entry.target_username || '系统') + '</small></div><time>' +
    (entry.timestamp || '--') + '</time></div>'
  )).join('') || '<p class="admin-muted">暂无日志</p>';
}

async function loadApp() {
  const me = await api('/api/admin/me');
  state.user = me.user;
  state.capabilities = me.capabilities || {};
  showApp();
  await loadPrices();
  await Promise.all([loadUsers(), loadAudit()]);
}

$('#login-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  setMessage('#login-message', '');
  try {
    const data = await api('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username: form.get('username'), password: form.get('password') }),
    });
    state.user = data.user;
    if (data.forcePasswordChange) showPasswordChange();
    else await loadApp();
  } catch (error) {
    setMessage('#login-message', error.message);
  }
});

async function submitPassword(form, messageSelector) {
  const data = new FormData(form);
  if (data.get('new_password') !== data.get('confirm_password')) throw new Error('两次输入的新密码不一致');
  await api('/api/admin/password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: data.get('current_password'),
      new_password: data.get('new_password'),
    }),
  });
  setMessage(messageSelector, '密码已更新', false);
}

$('#force-password-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await submitPassword(event.currentTarget, '#force-password-message');
    await loadApp();
  } catch (error) {
    setMessage('#force-password-message', error.message);
  }
});

$('#price-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const prices = $$('[data-price-id]').map((row) => ({
      id: row.dataset.priceId,
      sell_price: row.querySelector('[data-price-field="sell"]').value,
      recycle_price: row.querySelector('[data-price-field="recycle"]').value,
    }));
    await api('/api/admin/prices', { method: 'POST', body: JSON.stringify({ prices }) });
    await loadPrices();
    setMessage('#price-message', '价格已保存并立即公开', false);
  } catch (error) {
    setMessage('#price-message', error.message);
  }
});

$('#user-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  try {
    await api('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        username: data.get('username'),
        role: data.get('role'),
        temporary_password: data.get('temporary_password'),
      }),
    });
    event.currentTarget.reset();
    await loadUsers();
    setMessage('#user-message', '账号已创建，首次登录需修改密码', false);
  } catch (error) {
    setMessage('#user-message', error.message);
  }
});

$('#user-list')?.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-user-action]');
  if (!button) return;
  const id = button.dataset.userId;
  const action = button.dataset.userAction;
  try {
    if (action === 'delete') {
      if (!window.confirm('确定删除这个账号吗？')) return;
      await api('/api/admin/users/' + encodeURIComponent(id), { method: 'DELETE' });
    } else if (action === 'toggle') {
      const target = state.users.find((user) => user.id === id);
      await api('/api/admin/users/' + encodeURIComponent(id), {
        method: 'PATCH',
        body: JSON.stringify({ active: !target.active }),
      });
    } else if (action === 'reset') {
      const temporaryPassword = window.prompt('请输入新的临时密码（至少 8 位，含字母和数字）');
      if (!temporaryPassword) return;
      await api('/api/admin/users/' + encodeURIComponent(id), {
        method: 'POST',
        body: JSON.stringify({ temporary_password: temporaryPassword }),
      });
    }
    await loadUsers();
    setMessage('#user-message', '账号操作已完成', false);
  } catch (error) {
    setMessage('#user-message', error.message);
  }
});

$$('.admin-nav button').forEach((button) => {
  button.addEventListener('click', async () => {
    showPanel(button.dataset.panel);
    if (button.dataset.panel === 'user-manager') await loadUsers();
    if (button.dataset.panel === 'audit-log') await loadAudit();
  });
});

$('#logout-button')?.addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST' }).catch(() => {});
  showLogin();
});

loadApp().catch(() => showLogin());
