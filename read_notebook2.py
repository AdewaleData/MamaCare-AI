import json
import io
import sys

nb_path = r'c:\Users\555555\OneDrive\Desktop\MamaCare-AI\ai-development\ml-model\Mama-Care-AI-Hackathon.ipynb'
with open(nb_path, 'r', encoding='utf-8') as f:
    nb = json.load(f)

# Cells 18+
for i, cell in enumerate(nb.get('cells', [])):
    if i < 18:
        continue
    src = cell.get('source', [])
    if isinstance(src, list):
        src = ''.join(src)
    src_stripped = src.strip()
    if not src_stripped:
        continue
    print(f'\n{"="*60}')
    print(f'--- Cell {i} ({cell.get("cell_type")}) ---')
    print(f'{"="*60}')
    try:
        sys.stdout.write(src_stripped[:1500])
        if len(src_stripped) > 1500:
            sys.stdout.write(f'\n... ({len(src_stripped)} chars total)')
        sys.stdout.write('\n')
    except Exception:
        sys.stdout.write(f'[binary/encoded content, {len(src_stripped)} bytes]\n')
