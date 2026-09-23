// Безопасное подтверждение опасных действий
// Защита от случайного клика — нужно удерживать кнопку 2 секунды

export function createDangerConfirm(
  message: string,
  options: {
    buttonText?: string;
    holdMs?: number;
    onConfirm: () => void;
  }
): () => void {
  const { buttonText = 'Удерживайте 2 сек', holdMs = 2000, onConfirm } = options;

  // Показываем кастомный диалог
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    z-index: 9999;
  `;

  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: white;
    border-radius: 16px;
    padding: 24px;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  `;

  dialog.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
      <div style="width: 40px; height: 40px; border-radius: 50%; background: #fee2e2; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 20px;">⚠️</div>
      <div>
        <h3 style="font-weight: 700; font-size: 16px; margin: 0 0 4px 0; color: #991b1b;">Подтвердите действие</h3>
        <p style="font-size: 13px; color: #57534e; margin: 0; line-height: 1.4;">${message}</p>
      </div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button id="cancel-btn" style="
        flex: 1;
        padding: 12px;
        background: #f5f5f4;
        color: #1c1917;
        border: none;
        border-radius: 10px;
        font-weight: 600;
        cursor: pointer;
        font-size: 14px;
      ">Отмена</button>
      <button id="confirm-btn" style="
        flex: 1.5;
        padding: 12px;
        background: #dc2626;
        color: white;
        border: none;
        border-radius: 10px;
        font-weight: 700;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s;
        position: relative;
        overflow: hidden;
      ">${buttonText}</button>
    </div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const cancelBtn = dialog.querySelector('#cancel-btn') as HTMLButtonElement;
  const confirmBtn = dialog.querySelector('#confirm-btn') as HTMLButtonElement;

  let pressTimer: any = null;
  let progressBar: HTMLDivElement | null = null;

  const startPress = () => {
    confirmBtn.style.background = '#991b1b';

    // Создаём прогресс-бар внутри кнопки
    progressBar = document.createElement('div');
    progressBar.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 0%;
      background: rgba(0, 0, 0, 0.2);
      transition: width ${holdMs}ms linear;
    `;
    confirmBtn.appendChild(progressBar);

    requestAnimationFrame(() => {
      if (progressBar) progressBar.style.width = '100%';
    });

    pressTimer = setTimeout(() => {
      cleanup();
      onConfirm();
      overlay.remove();
    }, holdMs);
  };

  const endPress = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    confirmBtn.style.background = '#dc2626';
    if (progressBar) {
      progressBar.style.transition = 'width 200ms';
      progressBar.style.width = '0%';
    }
  };

  const cleanup = () => {
    endPress();
  };

  confirmBtn.addEventListener('mousedown', startPress);
  confirmBtn.addEventListener('mouseup', endPress);
  confirmBtn.addEventListener('mouseleave', endPress);
  confirmBtn.addEventListener('touchstart', startPress);
  confirmBtn.addEventListener('touchend', endPress);

  cancelBtn.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  return () => overlay.remove();
}
