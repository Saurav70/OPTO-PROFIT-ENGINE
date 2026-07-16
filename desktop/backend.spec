# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['dist_obf/run_backend.py'],
    pathex=['dist_obf'],
    binaries=[],
    datas=[('app/dist', 'app/dist')],
    hiddenimports=['uvicorn.logging', 'uvicorn.loops', 'uvicorn.loops.auto', 'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto', 'uvicorn.lifespan', 'uvicorn.lifespan.on', 'email_validator', 'aiosqlite', 'slowapi', 'slowapi.util', 'slowapi.errors', 'pyotp', 'multipart', 'fastapi.staticfiles', 'fastapi.responses', 'fastapi.middleware', 'fastapi.middleware.cors', 'fastapi.middleware.gzip', 'fastapi.middleware.httpsredirect', 'fastapi.middleware.trustedhost', 'starlette.middleware', 'starlette.middleware.cors', 'starlette.middleware.base', 'starlette.routing', 'starlette.staticfiles', 'starlette.responses', 'starlette.requests', 'cryptography', 'cryptography.hazmat', 'cryptography.hazmat.primitives', 'cryptography.hazmat.primitives.asymmetric', 'cryptography.hazmat.primitives.asymmetric.ed25519', 'cryptography.hazmat.backends'],
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
    name='backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['optoprofit_icon.ico'],
)
