export function initialDashboardTab(key: string, allowed: readonly string[]) {
  if (new URLSearchParams(window.location.search).get('demo') === '1') return 'overview';
  try {
    const saved = window.localStorage.getItem(key);
    return saved && allowed.includes(saved) ? saved : 'overview';
  } catch {
    return 'overview';
  }
}

export function rememberDashboardTab(key: string, value: string) {
  // A portfolio tour must not replace the user's normal saved workspace.
  if (new URLSearchParams(window.location.search).get('demo') === '1') return;
  try { window.localStorage.setItem(key, value); } catch { /* Navigation still works when storage is unavailable. */ }
}
