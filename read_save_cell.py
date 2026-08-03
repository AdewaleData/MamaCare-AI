import json

nb_path = r'c:\Users\555555\OneDrive\Desktop\MamaCare-AI\ai-development\ml-model\Mama-Care-AI-Hackathon.ipynb'
with open(nb_path, 'r', encoding='utf-8') as f:
    nb = json.load(f)

cell = nb['cells'][18]
src = cell.get('source', [])
if isinstance(src, list):
    src = ''.join(src)
print("Cell 18 content (save models):")
print(src)
