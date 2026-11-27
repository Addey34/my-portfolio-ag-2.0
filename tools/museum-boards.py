"""Assembler les captures réelles, sans retouche des rendus ni des états."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path('test-results/artistic-004')
font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 19)
title = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 25)
background = '#10151c'

for profile, width in [('desktop', 720), ('mobile', 412)]:
    rows = [('hero', 'Entrée / signature AG'), ('stack', 'Cube / présence sculpturale'),
            ('ludora-sync-lab', 'Instrument ouvert / pupitre Ludora')]
    sample = Image.open(root / 'before' / f'{profile}-hero.png')
    height = round(sample.height * width / sample.width)
    board = Image.new('RGB', (width * 2 + 48, (height + 44) * 3 + 132), background)
    draw = ImageDraw.Draw(board)
    draw.text((16, 12), f'AG — Le musée des systèmes / {profile}', font=title, fill='#f6f3ed')
    draw.text((16, 50), 'Référence ec9a41b / candidate locale — poses en mouvement réduit', font=font, fill='#bdc8d5')
    for column, (phase, label) in enumerate([('before', 'AVANT'), ('after', 'APRÈS')]):
        draw.text((16 + column * (width + 16), 90), label, font=font, fill='#d8c39a')
        for row, (scene, caption) in enumerate(rows):
            y = 126 + row * (height + 44)
            draw.text((16 + column * (width + 16), y), caption, font=font, fill='#f6f3ed')
            capture = Image.open(root / phase / f'{profile}-{scene}.png').convert('RGB')
            # Mise à l'échelle identique pour les deux colonnes ; aucun recadrage.
            capture = capture.resize((width, height), Image.Resampling.LANCZOS)
            board.paste(capture, (16 + column * (width + 16), y + 32))
    board.save(root / f'comparatif-{profile}.png')

ids = [('galaxy-observatory', '01 / Galaxy'), ('ludora-sync-lab', '02 / Ludora'),
       ('magnotes-knowledge-lab', '03 / MagNotes'), ('aigen-execution-lab', '04 / AIGen'),
       ('siteguardian-resilience-lab', '05 / SiteGuardian')]
board = Image.new('RGB', (1488, 1560), background)
draw = ImageDraw.Draw(board)
draw.text((16, 12), 'Cinq instruments / un langage d’exposition', font=title, fill='#f6f3ed')
draw.text((16, 50), 'Captures réelles 1440 × 900 affichées à 50 % — aucune retouche', font=font, fill='#bdc8d5')
for index, (scene, caption) in enumerate(ids):
    x = 16 + (index % 2) * 736
    y = 90 + (index // 2) * 490
    draw.text((x, y), caption, font=font, fill='#d8c39a')
    capture = Image.open(root / 'after' / f'desktop-{scene}.png').convert('RGB')
    board.paste(capture.resize((720, 450), Image.Resampling.LANCZOS), (x, y + 32))
board.save(root / 'instruments-ouverts.png')
print('Deux planches comparatives et une planche des cinq instruments créées.')
