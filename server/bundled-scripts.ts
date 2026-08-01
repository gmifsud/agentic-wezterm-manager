// Files under scripts/ that pkg embeds in the snapshot (see "pkg".assets in
// package.json) and that have to be unpacked next to the exe, because the
// snapshot filesystem is only readable by this process. Named explicitly rather
// than discovered with readdirSync: pkg's shim only reliably serves the exact
// asset paths it recorded, and a failed directory listing would leave
// {managerDir} pointing at a script that is not there.
// server/__tests__/packaging.test.ts keeps this in step with pkg.assets.
export const BUNDLED_SCRIPTS = ['Start-ObsidianProfiler.ps1'];
