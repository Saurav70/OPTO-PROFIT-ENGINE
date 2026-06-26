# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['run.py'],
    pathex=[],
    binaries=[],
    datas=[('app', 'app')],
    hiddenimports=['uvicorn.logging', 'uvicorn.loops', 'uvicorn.loops.auto', 'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto', 'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto', 'uvicorn.lifespan', 'uvicorn.lifespan.on', 'email_validator', 'aiosqlite', 'slowapi', 'slowapi.util', 'slowapi.errors', 'pyotp', 'webview', 'fastapi.staticfiles', 'fastapi.responses', 'cryptography', 'cryptography.hazmat', 'cryptography.hazmat.primitives', 'cryptography.hazmat.primitives.asymmetric', 'cryptography.hazmat.primitives.asymmetric.ed25519', 'cryptography.hazmat.backends'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)

# Filter out Windows system DLLs (like comctl32.dll) to prevent packaging warnings
# ("COMCTL32.dll module has missing imports") and avoid bundling system components.
a.binaries = [x for x in a.binaries if not (
    x[1].lower().startswith('c:\\windows') or 
    x[0].lower().startswith(('api-ms-win', 'ext-ms-win', 'comctl32.dll', 'gdi32.dll', 'kernel32.dll', 'user32.dll', 'shell32.dll', 'msvcrt.dll', 'advapi32.dll'))
)]

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='OPTO-PROFIT-DEBUG',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
