# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['run_desktop.py'],
    pathex=[],
    binaries=[],
    datas=[('dist', 'dist'), ('app', 'app')],
    hiddenimports=['uvicorn.logging', 'uvicorn.loops', 'uvicorn.loops.auto', 'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto', 'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto', 'uvicorn.lifespan', 'uvicorn.lifespan.on', 'email_validator', 'slowapi', 'slowapi.util', 'slowapi.errors', 'pyotp', 'multipart', 'fastapi.staticfiles', 'fastapi.responses', 'fastapi.middleware', 'fastapi.middleware.cors', 'starlette.middleware', 'starlette.middleware.cors', 'starlette.middleware.base', 'starlette.routing', 'starlette.staticfiles', 'starlette.responses', 'starlette.requests', 'sqlalchemy.dialects.sqlite', 'passlib.handlers.bcrypt', 'jose', 'jose.jwt', 'dotenv'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='OPTO-PROFIT',
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
    icon=['K:\\OPTO-PROFIT\\desktop\\optoprofit_icon.ico'],
)
