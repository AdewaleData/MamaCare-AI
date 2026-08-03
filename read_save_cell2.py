import json
import sys

nb_path = r'c:\Users\555555\OneDrive\Desktop\MamaCare-AI\ai-development\ml-model\Mama-Care-AI-Hackathon.ipynb'
with open(nb_path, 'r', encoding='utf-8') as f:
    nb = json.load(f)

cell = nb['cells'][18]
src = cell.get('source', [])
if isinstance(src, list):
    src = ''.join(src)

# Write to file instead of print to avoid encoding issues
with open(r'c:\Users\555555\OneDrive\Desktop\MamaCare-AI\save_cell_content.txt', 'w', encoding='utf-8') as f:
    f.write(src)

print("Saved to file. Length:", len(src))
