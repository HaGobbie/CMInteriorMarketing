import os

IGNORE_DIRS = {'node_modules', '.git', 'dist', 'build', '.vscode', '__pycache__'}
IGNORE_FILES = {'project_context.md', 'merge.py', 'package-lock.json', 'yarn.lock', '.DS_Store'}
IGNORE_EXTS = {'.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.pdf', '.zip'}

def generate_tree(start_dir="."):
    tree_str = "## Project Directory Tree\n```text\n"
    for root, dirs, files in os.walk(start_dir):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        level = root.replace(start_dir, '').count(os.sep)
        indent = ' ' * 4 * level
        tree_str += f"{indent}{os.path.basename(root)}/\n"
        sub_indent = ' ' * 4 * (level + 1)
        for f in files:
            if f not in IGNORE_FILES and not any(f.endswith(ext) for ext in IGNORE_EXTS):
                tree_str += f"{sub_indent}{f}\n"
    tree_str += "```\n\n---\n"
    return tree_str

def merge_everything():
    output_file = "project_context.md"
    found_files = 0
    
    with open(output_file, 'w', encoding='utf-8') as outfile:
        # 1. Write Directory Tree First
        outfile.write(generate_tree())
        
        # 2. Append File Contents
        for root, dirs, files in os.walk("."):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                if file in IGNORE_FILES or any(file.endswith(ext) for ext in IGNORE_EXTS):
                    continue
                
                file_path = os.path.join(root, file)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        ext = file.split('.')[-1] if '.' in file else ''
                        
                        outfile.write(f"\n\n### File: `{file_path}`\n")
                        outfile.write(f"```{ext}\n")
                        outfile.write(content)
                        outfile.write("\n```\n")
                        
                        found_files += 1
                        print(f"Added: {file_path}")
                except (UnicodeDecodeError, PermissionError):
                    continue

    if found_files > 0:
        print(f"\n✅ Success! Created {output_file} with {found_files} files.")

if __name__ == "__main__":
    merge_everything()