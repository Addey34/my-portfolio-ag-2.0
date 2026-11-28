"""Assembler les états réellement capturés par les tests, sans retouche du rendu."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path('test-results/living-final-render/artifacts')
output = Path('test-results/living-handoff')
output.mkdir(exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 17)
title = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 23)
rows = [
    ('galaxy-avant', 'Échelle comprimée', 'galaxy-apres', 'Échelle proportionnelle'),
    ('ludora-avant', 'Copies au repos', 'ludora-transit', 'Commande A en transit'),
    ('ludora-convergence', 'Copies convergentes v1', 'ludora-rejet', 'Version obsolète refusée'),
    ('magnotes-avant', 'N01 au départ', 'magnotes-deplace', 'N01 déplacée vers la droite'),
    ('magnotes-kanban', 'Projection Kanban', 'magnotes-chronologie', 'Échéance J7 / chronologie'),
]
for profile, width in [('desktop-chromium', 640), ('android-chromium', 412), ('iphone-webkit', 390)]:
    source = root / ('living-sculptures-sculptures-vivantes-' + profile)
    sample = Image.open(source / 'galaxy-avant.png')
    height = round(sample.height * width / sample.width)
    board = Image.new('RGB', (width * 2 + 48, 108 + (height + 48) * len(rows)), '#10151c')
    draw = ImageDraw.Draw(board)
    draw.text((16, 12), 'AG — Sculptures vivantes / ' + profile, font=title, fill='#f6f3ed')
    draw.text((16, 50), 'Commandes, modèles et rendu réel · même candidate · aucune retouche', font=font, fill='#bdc8d5')
    for row, (left, label_left, right, label_right) in enumerate(rows):
        y = 100 + row * (height + 48)
        for column, (name, label) in enumerate([(left, label_left), (right, label_right)]):
            x = 16 + column * (width + 16)
            draw.text((x, y), label, font=font, fill='#d8c39a')
            image = Image.open(source / (name + '.png')).convert('RGB')
            board.paste(image.resize((width, height), Image.Resampling.LANCZOS), (x, y + 32))
    board.save(output / (profile + '.png'))
print('Trois planches de captures réelles assemblées.')
