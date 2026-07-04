import os
import shutil
from pathlib import Path

# Configuration
SOURCE_DIR = Path(r"k:\OPTO-PROFIT")
TEMP_DIR = Path(r"k:\OPTO-PROFIT_Temp_Build")
OUTPUT_ZIP = Path(r"k:\OPTO-PROFIT_Source_Code_v1.1.0")

# Folders to completely ignore during the copy process
IGNORE_PATTERNS = shutil.ignore_patterns(
    "node_modules",
    "venv",
    "__pycache__",
    ".git",
    "dist",
    "build",
    "OPTO-PROFIT_Temp_Build"
)

def build_zip():
    print(f"[*] Starting clean source code packaging...")
    
    # 1. Clear out any previous temp directory
    if TEMP_DIR.exists():
        print(f"[*] Removing old temp directory: {TEMP_DIR}")
        shutil.rmtree(TEMP_DIR)
        
    # 2. Copy the entire project to the temp directory, excluding the heavy folders
    print(f"[*] Copying source files to {TEMP_DIR} (ignoring heavy directories like node_modules)...")
    shutil.copytree(SOURCE_DIR, TEMP_DIR, ignore=IGNORE_PATTERNS)
    
    # 3. Compress the clean temp directory into a ZIP file
    print(f"[*] Compressing into {OUTPUT_ZIP}.zip...")
    shutil.make_archive(str(OUTPUT_ZIP), 'zip', TEMP_DIR)
    
    # 4. Cleanup the temporary directory
    print(f"[*] Cleaning up temporary files...")
    shutil.rmtree(TEMP_DIR)
    
    print(f"[+] Success! Clean source code is ready at: {OUTPUT_ZIP}.zip")

if __name__ == "__main__":
    build_zip()
