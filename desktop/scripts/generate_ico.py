import os
from pathlib import Path
from PIL import Image

def generate_ico():
    current_dir = Path(__file__).parent.resolve()
    # The generated logo is located in the conversation brain artifacts folder
    # We search for it dynamically in the workspace/brain folder, or use the hardcoded path.
    # To be extremely safe, we will look for any png starting with 'optoprofit_logo' in the parent brain folder
    brain_dir = Path(r"C:\Users\SSaur\.gemini\antigravity-ide\brain\3c7c166f-ea1c-4939-9f49-2992dfa3823b")
    
    logo_png = None
    if brain_dir.exists():
        png_files = list(brain_dir.glob("optoprofit_logo*.png"))
        if png_files:
            logo_png = png_files[0]
            print(f"Found generated logo PNG at: {logo_png}")
            
    if not logo_png:
        # Fallback: search frontend assets
        frontend_logo = Path(__file__).parents[2] / "frontend" / "src" / "assets" / "hero.png"
        if frontend_logo.exists():
            logo_png = frontend_logo
            print(f"Using fallback logo PNG at: {logo_png}")
            
    if not logo_png:
        print("Error: No suitable PNG found for icon generation.")
        return False
        
    desktop_dir = Path(__file__).parents[1]
    ico_path = desktop_dir / "optoprofit_icon.ico"
    
    try:
        img = Image.open(logo_png)
        
        # Force square aspect ratio (256x256) to satisfy electron-builder requirements
        if hasattr(Image, 'Resampling'):
            resample = Image.Resampling.LANCZOS
        else:
            resample = Image.LANCZOS
            
        img = img.resize((256, 256), resample)
        
        # Create sizes: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256
        sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
        
        # Save as multi-resolution ICO file
        img.save(ico_path, format="ICO", sizes=sizes)
        print(f"Successfully generated high-fidelity ICO at: {ico_path}")
        return True
    except Exception as e:
        print(f"Failed to generate ICO file: {e}")
        return False

if __name__ == "__main__":
    generate_ico()
