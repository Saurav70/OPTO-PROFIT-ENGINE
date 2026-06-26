/**
 * OPTO-PROFIT — Electron Builder Configuration
 * ==============================================
 * Produces a Windows NSIS installer and/or portable .exe.
 *
 * The FastAPI backend (bundled as OPTO-PROFIT.exe via PyInstaller) is
 * included as an extraResource so Electron's main process can spawn it
 * as a sidecar child process at runtime.
 */

module.exports = {
  appId: 'com.optoprofit.desktop',
  productName: 'OPTO-PROFIT',
  copyright: `Copyright © ${new Date().getFullYear()} OPTO-PROFIT Team`,

  // ── Directories ───────────────────────────────────────────
  directories: {
    output: 'release',
    buildResources: 'build-resources',
  },

  // ── Files to include in the Electron asar ─────────────────
  files: [
    'electron/**/*',
    'frontend/dist/**/*',
    'package.json',
  ],

  // ── Extra resources (outside asar, accessible at runtime) ─
  extraResources: [
    {
      from: 'backend/dist/OPTO-PROFIT.exe',
      to: 'backend/OPTO-PROFIT.exe',
    },
  ],

  // ── Windows-specific ──────────────────────────────────────
  win: {
    target: [
      { target: 'nsis', arch: ['x64'] },
      { target: 'portable', arch: ['x64'] },
    ],
    icon: 'desktop/optoprofit_icon.ico',
    // Code-signing (uncomment when you have a certificate):
    // certificateFile: 'path/to/certificate.pfx',
    // certificatePassword: process.env.CSC_KEY_PASSWORD,
  },

  // ── NSIS Installer Options ────────────────────────────────
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: 'desktop/optoprofit_icon.ico',
    uninstallerIcon: 'desktop/optoprofit_icon.ico',
    installerHeaderIcon: 'desktop/optoprofit_icon.ico',
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'OPTO-PROFIT',
    deleteAppDataOnUninstall: false, // Preserve user data
  },

  // ── Portable Options ──────────────────────────────────────
  portable: {
    artifactName: 'OPTO-PROFIT-Portable-${version}.${ext}',
  },

  // ── Auto-update publish config ────────────────────────────
  publish: [
    {
      provider: 'github',
      owner: 'YOUR_GITHUB_USERNAME',   // ← Replace with your GitHub username
      repo: 'OPTO-PROFIT',             // ← Replace with your repo name
      releaseType: 'release',
    },
  ],

  // ── Build optimizations ───────────────────────────────────
  asar: true,
  compression: 'maximum',
  removePackageScripts: true,
};
