export function whenIdle(callback: () => void, timeout = 3000): void {
    const idle = (window as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback;
    if (idle) idle(callback, { timeout });
    else setTimeout(callback, 200);
}
