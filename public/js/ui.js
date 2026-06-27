const toast = document.querySelector('#toast');

export function showToast(message, type = '') {
  toast.textContent = message;
  toast.className = `toast ${type}`.trim();
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.hidden = true;
  }, 2800);
}

export function setBusy(button, busy, label) {
  button.disabled = busy;
  button.classList.toggle('is-busy', busy);
  button.textContent = busy ? '生成中...' : label;
}
