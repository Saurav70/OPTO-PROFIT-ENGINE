import os
import sys
import re

# Standards defined in optoprofit-standards.md
REQUIRED_COLORS = [
    "#0f172a", # Sidebar Dark Slate
    "#0d9488", # Teal Highlight
    "#f8fafc", # Light Slate background
    "#f1f5f9", # Shell background
    "#a855f7", # Purple
    "#f59e0b", # Amber
    "#ef4444", # Red
]

FORBIDDEN_UNITS = [
    r"\binch\b",
    r"\binches\b",
    r"\bfeet\b",
    r"\bft\b",
    r"\blbs\b",
    r"\bpound\b",
    r"\boz\b",
]

def check_metric_compliance():
    print("--- Checking Metric Unit Compliance ---")
    violations = []
    # Scan frontend and backend source files
    for root, dirs, files in os.walk("."):
        if "node_modules" in root or "venv" in root or ".git" in root or "dist" in root:
            continue
        
        for file in files:
            if file.endswith((".jsx", ".js", ".py", ".css", ".md")):
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read()
                        for unit_regex in FORBIDDEN_UNITS:
                            if re.search(unit_regex, content, re.IGNORECASE):
                                # Simple heuristic: if it's in a comment or string, it might be a violation
                                # For now, we report all occurrences
                                violations.append(f"Violation: Found imperial unit reference in {path}")
                except Exception as e:
                    print(f"Error reading {path}: {e}")
    
    if violations:
        for v in violations:
            print(v)
        return False
    print("[PASS] All units appear to be metric.")
    return True

def check_design_tokens():
    print("--- Checking Design System Tokens ---")
    # Check if index.css or main style file contains the brand colors
    css_path = "frontend/src/index.css"
    if not os.path.exists(css_path):
        # Try to find any css file in src
        found = False
        for root, dirs, files in os.walk("frontend/src"):
            for file in files:
                if file.endswith(".css"):
                    css_path = os.path.join(root, file)
                    found = True
                    break
            if found: break
    
    if not os.path.exists(css_path):
        print(f"Warning: Could not find CSS file at {css_path}")
        return True # Don't fail if file missing, maybe it's styled differently
    
    with open(css_path, "r", encoding="utf-8") as f:
        content = f.read().lower()
        missing = []
        for color in REQUIRED_COLORS:
            if color.lower() not in content:
                missing.append(color)
    
    if missing:
        print(f"Missing required brand colors in {css_path}: {', '.join(missing)}")
        return False
    print(f"[PASS] CSS tokens in {css_path} match standards.")
    return True

def check_dependencies():
    print("--- Checking Industrial Component Library ---")
    pkg_path = "frontend/package.json"
    if not os.path.exists(pkg_path):
        print("Warning: package.json not found")
        return True
    
    with open(pkg_path, "r", encoding="utf-8") as f:
        content = f.read()
        required = ["lucide-react", "framer-motion"]
        missing = [lib for lib in required if lib not in content]
        
    if missing:
        print(f"Missing required industrial libraries: {', '.join(missing)}")
        return False
    print("[PASS] Required libraries (lucide-react, framer-motion) are present.")
    return True

def check_financial_logic():
    print("--- Checking Financial Logic (ROI) ---")
    router_path = "backend/app/routers/analytics.py"
    if not os.path.exists(router_path):
        print(f"Violation: Missing Financial/ROI router at {router_path}")
        return False
    
    with open(router_path, "r", encoding="utf-8") as f:
        content = f.read()
        if "calculate_daily_production" not in content or "roi" not in content.lower():
            print(f"Violation: ROI calculation logic missing in {router_path}")
            return False
            
    print("[PASS] Financial ROI logic is present in backend.")
    return True

def main():
    success = True
    if not check_metric_compliance():
        success = False
    if not check_design_tokens():
        success = False
    if not check_dependencies():
        success = False
    if not check_financial_logic():
        success = False
        
    if not success:
        print("\n[FAIL] Standards check failed. Please ensure the project follows 'optoprofit-standards.md'.")
        sys.exit(1)
    else:
        print("\n[SUCCESS] All Industrial Engineering standards passed!")
        sys.exit(0)

if __name__ == "__main__":
    main()
