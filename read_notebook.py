import json

nb_path = r'c:\Users\555555\OneDrive\Desktop\MamaCare-AI\ai-development\ml-model\Mama-Care-AI-Hackathon.ipynb'
with open(nb_path, 'r', encoding='utf-8') as f:
    nb = json.load(f)

print('Notebook keys:', list(nb.keys()))
print('Number of cells:', len(nb.get('cells', [])))

for i, cell in enumerate(nb.get('cells', [])):
    src = cell.get('source', [])
    if isinstance(src, list):
        src = ''.join(src)
    src_stripped = src.strip()
    if not src_stripped:
        continue
    print(f'\n{"="*60}')
    print(f'--- Cell {i} ({cell.get("cell_type")}) ---')
    print(f'{"="*60}')
    # Print first 800 chars
    preview = src_stripped[:800]
    if len(src_stripped) > 800:
        preview += f'\n... ({len(src_stripped)} chars total)'
    print(preview)
