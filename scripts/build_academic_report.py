import os
import glob
from pathlib import Path

def build_report():
    print("[*] Starting compilation of the Academic Report...")
    
    docs_dir = Path("k:/OPTO-PROFIT/docs/academic_report")
    output_md = Path("k:/OPTO-PROFIT/docs/OPTO-PROFIT_Academic_Report.md")
    
    # Get all markdown files in the academic_report directory
    chapter_files = sorted(glob.glob(str(docs_dir / "*.md")))
    
    if not chapter_files:
        print("[!] No chapters found to compile.")
        return
        
    compiled_content = []
    
    for file_path in chapter_files:
        print(f"  -> Reading {Path(file_path).name}...")
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            compiled_content.append(content)
            compiled_content.append("\n\n<!-- PAGE BREAK -->\n\n")
            
    # Write to final markdown file
    with open(output_md, "w", encoding="utf-8") as f:
        f.write("".join(compiled_content))
        
    print(f"\n[+] Successfully compiled {len(chapter_files)} chapters into:")
    print(f"    {output_md.absolute()}")
    print("\nNote: You can use tools like Pandoc to convert this massive Markdown file to .docx or .pdf.")

if __name__ == "__main__":
    build_report()
