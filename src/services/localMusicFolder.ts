/**
 * Local Music Folder Service
 * Handles File System Access API (showDirectoryPicker) and fallback directory selector.
 * Scans, classifies files into 5 categories: Sax Alto, Sax Tenor, Flauta, Trompete, Trombone.
 */

export type InstrumentCategory = 'sax_alto' | 'sax_tenor' | 'flauta' | 'trompete' | 'trombone' | 'outros';

export interface LocalSheetFile {
  id: string;
  name: string;
  category: InstrumentCategory;
  extension: string;
  size: number;
  lastModified: number;
  relativePath: string;
  fileHandle?: FileSystemFileHandle;
  fileObject?: File;
  blob?: Blob;
}

export interface CategoryMeta {
  id: InstrumentCategory;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  badgeColor: string;
  image?: string;
}

export const INSTRUMENT_CATEGORIES: CategoryMeta[] = [
  {
    id: 'sax_alto',
    title: 'Sax Alto',
    subtitle: 'Partituras em Mi Bemol (Eb)',
    emoji: '🎷',
    color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-300',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    image: '/assets/instruments/alto_sax.jpg'
  },
  {
    id: 'sax_tenor',
    title: 'Sax Tenor',
    subtitle: 'Partituras em Si Bemol (Bb)',
    emoji: '🎷',
    color: 'from-orange-500/20 to-amber-600/10 border-orange-500/30 text-orange-300',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    image: '/assets/instruments/alto_sax.jpg'
  },
  {
    id: 'flauta',
    title: 'Flauta Transversal',
    subtitle: 'Partituras em Dó (Clave de Sol)',
    emoji: '🪈',
    color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-300',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    image: '/assets/instruments/flauta.jpg'
  },
  {
    id: 'trompete',
    title: 'Trompete',
    subtitle: 'Partituras em Si Bemol (Bb)',
    emoji: '🎺',
    color: 'from-yellow-500/20 to-rose-500/10 border-yellow-500/30 text-yellow-300',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
  },
  {
    id: 'trombone',
    title: 'Trombone de Vara',
    subtitle: 'Partituras em Dó/Bb (Clave de Fá)',
    emoji: '🎺',
    color: 'from-rose-500/20 to-violet-500/10 border-rose-500/30 text-rose-300',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    image: '/assets/instruments/trombone.jpg'
  }
];

// Helper to normalize strings for search without accents and in lowercase
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Classifies a file into one of the 5 requested categories based on its filename and relative path.
 */
export function classifySheetFile(fileName: string, relativePath = ''): InstrumentCategory {
  const combined = normalizeString(`${relativePath} ${fileName}`);

  // Test Sax Tenor first to avoid misclassifying "tenor" as generic sax
  const hasTenor = combined.includes('sax tenor') ||
                   combined.includes('sax-tenor') ||
                   combined.includes('sax_tenor') ||
                   combined.includes('tenor sax') ||
                   combined.includes('tenor-sax') ||
                   combined.includes('tenorsax') ||
                   combined.includes('saxofone tenor') ||
                   combined.includes('sax_bb') ||
                   (combined.includes('tenor') && !combined.includes('baixo') && !combined.includes('trombone'));

  if (hasTenor) return 'sax_tenor';

  // Test Sax Alto
  const hasAlto = combined.includes('sax alto') ||
                  combined.includes('sax-alto') ||
                  combined.includes('sax_alto') ||
                  combined.includes('alto sax') ||
                  combined.includes('alto-sax') ||
                  combined.includes('altosax') ||
                  combined.includes('saxofone alto') ||
                  combined.includes('sax_eb') ||
                  combined.includes('alto') ||
                  (combined.includes('sax') && !combined.includes('baritono') && !combined.includes('soprano'));

  if (hasAlto) return 'sax_alto';

  // Test Flauta
  const hasFlauta = combined.includes('flauta') ||
                    combined.includes('flute') ||
                    combined.includes('flautim') ||
                    combined.includes('piccolo');

  if (hasFlauta) return 'flauta';

  // Test Trompete
  const hasTrompete = combined.includes('trompete') ||
                      combined.includes('trumpet') ||
                      combined.includes('trompeta') ||
                      combined.includes('tpt') ||
                      combined.includes('trompet');

  if (hasTrompete) return 'trompete';

  // Test Trombone
  const hasTrombone = combined.includes('trombone') ||
                      combined.includes('trombon') ||
                      combined.includes('trb') ||
                      combined.includes('tbn');

  if (hasTrombone) return 'trombone';

  return 'outros';
}

// In-memory instant cache for fast SPA navigation between tabs
let inMemoryCachedFiles: LocalSheetFile[] = [];
let inMemoryCachedFolderName: string | null = null;

export function getInMemoryCachedFiles(): LocalSheetFile[] {
  return inMemoryCachedFiles;
}

export function getInMemoryCachedFolderName(): string | null {
  return inMemoryCachedFolderName;
}

// IndexedDB Helper to persist directory handle and sheet files safely
const DB_NAME = 'tutti_music_library';
const DB_VERSION = 2;
const STORE_HANDLES = 'handles';
const STORE_SHEETS = 'saved_sheets';
const STORE_META = 'library_meta';

async function getIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_HANDLES)) {
        db.createObjectStore(STORE_HANDLES);
      }
      if (!db.objectStoreNames.contains(STORE_SHEETS)) {
        db.createObjectStore(STORE_SHEETS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePersistedDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await getIndexedDB();
    const tx = db.transaction(STORE_HANDLES, 'readwrite');
    tx.objectStore(STORE_HANDLES).put(handle, 'music_folder_handle');
  } catch (err) {
    console.warn('Could not persist directory handle to IndexedDB:', err);
  }
}

export async function getPersistedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await getIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_HANDLES, 'readonly');
      const req = tx.objectStore(STORE_HANDLES).get('music_folder_handle');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

/**
 * Persists all scanned sheets (including binary Blobs/Files) into IndexedDB
 * so users can navigate across the app without losing their sheets!
 */
export async function savePersistedSheets(files: LocalSheetFile[], folderName: string): Promise<void> {
  try {
    inMemoryCachedFiles = files;
    inMemoryCachedFolderName = folderName;

    const db = await getIndexedDB();
    const tx = db.transaction([STORE_SHEETS, STORE_META], 'readwrite');
    const sheetsStore = tx.objectStore(STORE_SHEETS);
    const metaStore = tx.objectStore(STORE_META);

    // Save folder metadata
    metaStore.put({ key: 'folder_name', value: folderName });
    metaStore.put({ key: 'last_updated', value: Date.now() });

    // Save each file record with its Blob/File
    for (const item of files) {
      let blob: Blob | undefined = undefined;
      if (item.fileObject) {
        blob = item.fileObject;
      } else if (item.blob) {
        blob = item.blob;
      } else if (item.fileHandle) {
        try {
          blob = await item.fileHandle.getFile();
        } catch {
          // Keep without blob if handle cannot be read currently
        }
      }

      sheetsStore.put({
        id: item.id,
        name: item.name,
        category: item.category,
        extension: item.extension,
        size: item.size,
        lastModified: item.lastModified,
        relativePath: item.relativePath,
        fileHandle: item.fileHandle,
        blob: blob
      });
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Erro ao salvar partituras no IndexedDB:', err);
  }
}

/**
 * Loads all persisted sheets from IndexedDB on component mount / app launch
 */
export async function getPersistedSheets(): Promise<{ files: LocalSheetFile[]; folderName: string | null }> {
  // If in-memory cache is already present, return immediately for instantaneous transitions
  if (inMemoryCachedFiles && inMemoryCachedFiles.length > 0) {
    return {
      files: inMemoryCachedFiles,
      folderName: inMemoryCachedFolderName || 'música'
    };
  }

  try {
    const db = await getIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_SHEETS, STORE_META], 'readonly');
      const sheetsStore = tx.objectStore(STORE_SHEETS);
      const metaStore = tx.objectStore(STORE_META);

      const sheetsReq = sheetsStore.getAll();
      const metaReq = metaStore.get('folder_name');

      tx.oncomplete = () => {
        const rawRecords = (sheetsReq.result || []) as any[];
        const folderName = metaReq.result ? metaReq.result.value : (rawRecords.length > 0 ? 'música' : null);

        const mappedFiles: LocalSheetFile[] = rawRecords.map(rec => ({
          id: rec.id,
          name: rec.name,
          category: rec.category,
          extension: rec.extension,
          size: rec.size,
          lastModified: rec.lastModified,
          relativePath: rec.relativePath,
          fileHandle: rec.fileHandle,
          blob: rec.blob,
          fileObject: rec.blob ? new File([rec.blob], rec.name, {
            type: rec.blob.type || (rec.extension === 'pdf' ? 'application/pdf' : 'application/octet-stream'),
            lastModified: rec.lastModified
          }) : undefined
        }));

        inMemoryCachedFiles = mappedFiles;
        inMemoryCachedFolderName = folderName;

        resolve({ files: mappedFiles, folderName });
      };

      tx.onerror = () => resolve({ files: [], folderName: null });
    });
  } catch (err) {
    console.warn('Erro ao carregar partituras do IndexedDB:', err);
    return { files: [], folderName: null };
  }
}

/**
 * Deletes specific sheet IDs from IndexedDB
 */
export async function deletePersistedSheets(ids: string[]): Promise<void> {
  try {
    inMemoryCachedFiles = inMemoryCachedFiles.filter(f => !ids.includes(f.id));
    const db = await getIndexedDB();
    const tx = db.transaction(STORE_SHEETS, 'readwrite');
    const store = tx.objectStore(STORE_SHEETS);
    for (const id of ids) {
      store.delete(id);
    }
  } catch (err) {
    console.warn('Erro ao deletar partituras salvas:', err);
  }
}

/**
 * Clears all saved sheets from IndexedDB
 */
export async function clearPersistedSheets(): Promise<void> {
  try {
    inMemoryCachedFiles = [];
    inMemoryCachedFolderName = null;
    const db = await getIndexedDB();
    const tx = db.transaction([STORE_SHEETS, STORE_META], 'readwrite');
    tx.objectStore(STORE_SHEETS).clear();
    tx.objectStore(STORE_META).clear();
  } catch (err) {
    console.warn('Erro ao limpar partituras:', err);
  }
}

/**
 * Scan directory recursively with safety depth
 */
export async function scanDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  currentPath = '',
  maxDepth = 4
): Promise<LocalSheetFile[]> {
  const results: LocalSheetFile[] = [];

  async function walk(handle: FileSystemDirectoryHandle, path: string, depth: number) {
    if (depth > maxDepth) return;
    for await (const entry of (handle as any).values()) {
      if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle;
        const name = fileHandle.name;
        // Ignore hidden and OS metadata files
        if (name.startsWith('.') || name.startsWith('~$') || name === 'Thumbs.db') continue;

        const extMatch = name.match(/\.([0-9a-z]+)$/i);
        const extension = extMatch ? extMatch[1].toLowerCase() : '';

        // Check if supported format
        const supported = [
          'pdf', 'jpg', 'jpeg', 'png', 'webp', 'svg', 'gif',
          'mxl', 'xml', 'musicxml', 'mid', 'midi', 'gp', 'gp5', 'gpx',
          'txt', 'cifra', 'chordpro'
        ];
        if (!supported.includes(extension)) continue;

        try {
          const file = await fileHandle.getFile();
          const category = classifySheetFile(name, path);
          results.push({
            id: `${path}/${name}`,
            name,
            category,
            extension,
            size: file.size,
            lastModified: file.lastModified,
            relativePath: path ? `${path}/${name}` : name,
            fileHandle
          });
        } catch (e) {
          console.warn(`Could not read file ${name}:`, e);
        }
      } else if (entry.kind === 'directory') {
        const subDirHandle = entry as FileSystemDirectoryHandle;
        // Ignore system folders
        if (subDirHandle.name.startsWith('.') || subDirHandle.name === 'node_modules') continue;
        const nextPath = path ? `${path}/${subDirHandle.name}` : subDirHandle.name;
        await walk(subDirHandle, nextPath, depth + 1);
      }
    }
  }

  await walk(dirHandle, currentPath, 0);
  return results;
}

/**
 * Scan FileList from fallback input[webkitdirectory]
 */
export function scanFileList(fileList: FileList): LocalSheetFile[] {
  const results: LocalSheetFile[] = [];
  const supported = [
    'pdf', 'jpg', 'jpeg', 'png', 'webp', 'svg', 'gif',
    'mxl', 'xml', 'musicxml', 'mid', 'midi', 'gp', 'gp5', 'gpx',
    'txt', 'cifra', 'chordpro'
  ];

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const name = file.name;
    if (name.startsWith('.') || name.startsWith('~$') || name === 'Thumbs.db') continue;

    const extMatch = name.match(/\.([0-9a-z]+)$/i);
    const extension = extMatch ? extMatch[1].toLowerCase() : '';
    if (!supported.includes(extension)) continue;

    const relativePath = file.webkitRelativePath || file.name;
    const category = classifySheetFile(name, relativePath);

    results.push({
      id: `${relativePath}-${i}`,
      name,
      category,
      extension,
      size: file.size,
      lastModified: file.lastModified,
      relativePath,
      fileObject: file
    });
  }

  return results;
}

/**
 * Gets real File from item (either via fileHandle.getFile() or fileObject)
 */
export async function getFileFromLocalItem(item: LocalSheetFile): Promise<File | null> {
  if (item.fileObject) {
    return item.fileObject;
  }
  if (item.blob) {
    const b = item.blob;
    return new File([b], item.name, {
      type: b.type || (item.extension === 'pdf' ? 'application/pdf' : 'application/octet-stream'),
      lastModified: item.lastModified
    });
  }
  if (item.fileHandle) {
    try {
      return await item.fileHandle.getFile();
    } catch (err) {
      console.warn('Error reading from FileHandle, trying fallback:', err);
      return null;
    }
  }
  return null;
}

/**
 * Format bytes into human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
