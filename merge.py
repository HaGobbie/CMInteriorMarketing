import os

# We only exclude the 'heavy' stuff that would confuse the AI
IGNORE_DIRS = {'node_modules', '.git', 'dist', 'build', '.vscode', '__pycache__'}
IGNORE_FILES = {'project_context.md', 'merge.py', 'package-lock.json', 'yarn.lock'}

def merge_everything():
    output_file = "project_context.md"
    found_files = 0
    
    with open(output_file, 'w', encoding='utf-8') as outfile:
        for root, dirs, files in os.walk("."):
            # Skip the ignored folders
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                if file not in IGNORE_FILES:
                    file_path = os.path.join(root, file)
                    
                    # Try to write the file content
                    try:
                        with open(file_path, 'r', encoding='utf-8') as infile:
                            content = infile.read()
                            outfile.write(f"\n\n--- FILE: {file_path} ---\n")
                            outfile.write(content)
                            found_files += 1
                            print(f"Added: {file_path}")
                    except (UnicodeDecodeError, PermissionError):
                        # This skips images, PDFs, or system files that can't be read as text
                        continue

    if found_files > 0:
        print(f"\n✅ Success! Created {output_file} with {found_files} files.")
    else:
        print("\n❌ Still no files found. Are you sure you're running the script inside the project folder?")

if __name__ == "__main__":
    merge_everything()