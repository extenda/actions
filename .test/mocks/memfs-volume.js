import { createFsFromVolume, Volume } from 'memfs';

// One in-memory volume shared by the fs, mock-fs and fast-glob mocks.
// memfs 4.79+ fixes the cwd of its default vol at '/', so relative paths would miss the files
// that mockFs() creates. A Volume created here resolves relative paths against process.cwd().
export const vol = new Volume();
export const fs = createFsFromVolume(vol);
