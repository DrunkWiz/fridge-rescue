import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * The picker returns a cache URI the OS may clear, so diary photos are copied
 * into the app's document directory. On web the URI is kept as-is (browser
 * storage is best-effort there anyway).
 */
export function keepPhoto(uri: string, id: string): string {
  if (Platform.OS === 'web') return uri;
  const dir = new Directory(Paths.document, 'diary');
  if (!dir.exists) dir.create({ intermediates: true });
  const dest = new File(dir, `${id}.jpg`);
  new File(uri).copy(dest);
  return dest.uri;
}

export function deletePhoto(uri: string | undefined) {
  if (!uri || Platform.OS === 'web') return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Already gone; nothing to clean up.
  }
}
