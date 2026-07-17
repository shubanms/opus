// Backup / restore — write a JSON or CSV file and hand it to the Android share
// sheet; import reads a picked JSON file back in. Ports the web dataActions
// (download/upload → file + share sheet on native). Reuses @opus/core/csv.
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { csv, dateKey } from '@opus/core';
import { exportAllRows, importAllRows, exportSetsRows } from './db';
import { getSetting } from './settings';

async function writeAndShare(filename, content, mimeType, uti) {
  const uri = FileSystem.documentDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, content);
  if (!(await Sharing.isAvailableAsync())) return { ok: false, reason: 'sharing-unavailable', uri };
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Export OPUS data', UTI: uti });
  return { ok: true };
}

export async function exportJson() {
  try {
    const payload = exportAllRows();
    return await writeAndShare(`opus-backup-${dateKey.todayKey()}.json`, JSON.stringify(payload, null, 2), 'application/json', 'public.json');
  } catch (e) { return { ok: false, reason: String(e?.message || e) }; }
}

export async function exportCsv() {
  try {
    const unit = getSetting('unit') || 'kg';
    const content = csv.setsToCsv(exportSetsRows(), unit);
    return await writeAndShare(`opus-sets-${dateKey.todayKey()}.csv`, content, 'text/csv', 'public.comma-separated-values-text');
  } catch (e) { return { ok: false, reason: String(e?.message || e) }; }
}

export async function importJson() {
  try {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
    if (res.canceled) return { ok: false, reason: 'cancelled' };
    const uri = res.assets?.[0]?.uri;
    if (!uri) return { ok: false, reason: 'no-file' };
    const text = await FileSystem.readAsStringAsync(uri);
    const parsed = JSON.parse(text);
    if (parsed?.app !== 'OPUS') return { ok: false, reason: 'not-opus' };
    importAllRows(parsed);
    return { ok: true };
  } catch (e) { return { ok: false, reason: String(e?.message || e) }; }
}
