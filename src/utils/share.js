import html2canvas from 'html2canvas';

async function captureBlob(node) {
  if (!node) return null;
  if (document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* ignore */ }
  }
  const canvas = await html2canvas(node, {
    backgroundColor: null,
    scale: 1,
    useCORS: true,
    logging: false,
  });
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

// Captures `node` as a PNG and shares it via the Web Share API,
// falling back to a download when sharing files isn't supported.
export async function shareCard(node, filename = 'opus-workout.png') {
  const blob = await captureBlob(node);
  if (!blob) return;
  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'OPUS', text: 'Build your masterpiece.' });
      return;
    } catch (e) {
      if (e?.name === 'AbortError') return; // user dismissed the sheet
      // otherwise fall through to download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
