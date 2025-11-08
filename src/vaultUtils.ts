import { App, TFile } from "obsidian";

/**
 * Ensure a folder exists (create if missing)
 */
export async function ensureFolder(app: App, path: string): Promise<void> {
  const folder = app.vault.getAbstractFileByPath(path);
  if (!folder) await app.vault.createFolder(path);
}

/**
 * Save binary data into the vault (creates or overwrites)
 */
export async function saveBinary(
  app: App,
  path: string,
  data: Uint8Array
): Promise<TFile> {
  try {
    return await app.vault.createBinary(path, data);
  } catch (err) {
    if ((err as Error).message.includes("already exists")) {
      const [name, ext] = path.split(".");
      const alt = `${name}_${Math.floor(Math.random() * 1000)}.${ext}`;
      return await app.vault.createBinary(alt, data);
    }
    throw err;
  }
}
