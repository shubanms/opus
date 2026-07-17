// Capture a rendered view as a PNG and hand it to the Android share sheet.
// Mirrors the web's utils/share.js (html2canvas → Web Share API); here we use
// react-native-view-shot to snapshot the off-screen full-size card and
// expo-sharing to present the native chooser.
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

// expo-sharing (Android FileProvider) wants a file:// URI. view-shot's tmpfile
// result can come back as a bare path — normalise it.
function toFileUri(uri) {
  if (!uri) return uri;
  if (uri.startsWith('file://') || uri.startsWith('content://')) return uri;
  return `file://${uri}`;
}

// Snapshot `ref` (a ViewShot or a plain view ref) to a PNG and open the share
// sheet. Returns { ok, reason } — callers surface failures, never throw.
export async function captureAndShare(ref, { dialogTitle = 'Share your OPUS card' } = {}) {
  if (!ref?.current) return { ok: false, reason: 'no-view' };
  let uri;
  try {
    uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
  } catch (e) {
    return { ok: false, reason: `capture-failed: ${e?.message || e}` };
  }

  try {
    if (!(await Sharing.isAvailableAsync())) return { ok: false, reason: 'sharing-unavailable' };
    await Sharing.shareAsync(toFileUri(uri), {
      mimeType: 'image/png',
      dialogTitle,
      UTI: 'public.png',
    });
    return { ok: true };
  } catch (e) {
    // A user-dismissed sheet also lands here on some OEMs — treat as benign.
    return { ok: false, reason: `share-failed: ${e?.message || e}` };
  }
}
