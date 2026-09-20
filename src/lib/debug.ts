/**
 * Tự động trích xuất tên component React gọi hàm/hook từ Call Stack.
 * Tự động bỏ qua các hook nội bộ (bắt đầu bằng 'use' hoặc nằm trong thư mục /hooks/).
 */
export function getCallerComponentName(): string {
  try {
    const stack = new Error().stack;
    if (!stack) return 'Component';

    const lines = stack.split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // Tự động bỏ qua các hàm debug, thư viện React, và tất cả các hook (bắt đầu bằng 'use')
      if (
        line.includes('getCallerComponentName') ||
        line.includes('/hooks/') ||
        /at\s+(?:async\s+)?(?:Object\.)?use[A-Z]/.test(line) ||
        line.includes('react-dom') ||
        line.includes('node_modules')
      ) {
        continue;
      }

      // 1. Khớp tên component (bắt đầu bằng chữ hoa, bỏ qua 'Object', 'eval')
      const funcMatch = line.match(/at\s+(?:async\s+)?(?:Object\.)?([A-Z][A-Za-z0-9_]+)\s*\(/);
      if (funcMatch && funcMatch[1] && funcMatch[1] !== 'Object') {
        return funcMatch[1];
      }

      // 2. Nếu hàm bị bọc anonymous/eval, trích xuất từ tên file .tsx trong path
      const fileMatch = line.match(/([A-Z][A-Za-z0-9_]+)\.(?:tsx|jsx)/);
      if (fileMatch && fileMatch[1]) {
        return fileMatch[1];
      }

      // 3. Khớp định dạng chunk name của Next.js / Turbopack
      const chunkMatch = line.match(/_([A-Z][A-Za-z0-9_]+)_tsx/);
      if (chunkMatch && chunkMatch[1]) {
        return chunkMatch[1];
      }
    }
  } catch {
    // fallback an toàn nếu môi trường chặn đọc stack trace
  }
  return 'Component';
}
