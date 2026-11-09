#!/usr/bin/env python3
import os
import subprocess

def generate_all_receipts():
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'public', 'mock-receipts')
    os.makedirs(out_dir, exist_ok=True)

    receipts = [
        {
            'file': 'ticket-super-u-nourriture.jpg',
            'title': 'SUPER U - SAINT-MARTIN',
            'sub': 'Rue de la Foret - 78120 St-Martin',
            'date': '12/10/2026 16:42:18',
            'lines': [
                ('6x BAGUETTE TRADITION', '7.20'),
                ('1x PATE A TARTINER 750G', '4.85'),
                ('4x COQUILLETTES 1KG', '5.40'),
                ('6x LAIT DEMI-ECREME 1L', '6.90'),
                ('1x SIROP GRENADINE TEISSEIRE', '3.15'),
                ('POMMES GOLDEN 2.340KG', '4.68'),
                ('5x CHOCOLAT AU LAIT 200G', '8.75'),
                ('3x BISCUITS PETIT BEURRE LU', '7.72')
            ],
            'total': '48.65',
            'pay': 'CARTE BANCAIRE UNITE',
            'tva': 'TVA 5.5% : 2.54 EUR'
        },
        {
            'file': 'facture-leroy-materiel.jpg',
            'title': 'BRICOMARCHE - MATERIEL',
            'sub': 'Zone Artisanale - 78120 Rambouillet',
            'date': '18/10/2026 11:15:02',
            'lines': [
                ('2x BOBINE FICELLE SISAL 200M', '24.90'),
                ('1x BACHE ARMEE 4X5M ETANCHE', '34.50'),
                ('1x BOITE VIS BOIS 4X40 X200', '11.80'),
                ('1x HUILE DE LIN PUR 1L', '9.20'),
                ('2x PAPIER DE VERRE ASSORTI', '9.50')
            ],
            'total': '89.90',
            'pay': 'CB SANS CONTACT',
            'tva': 'TVA 20% : 14.98 EUR'
        },
        {
            'file': 'ticket-station-total-carburant.jpg',
            'title': 'TOTALENERGIES - RELAIS FORET',
            'sub': 'Station 0482 - N10 km 42',
            'date': '24/10/2026 08:35:40',
            'lines': [
                ('POMPE 04 - GAZOLE B7', ''),
                ('42.15 LITRES A 1.729 EUR/L', '72.88')
            ],
            'total': '72.88',
            'pay': 'CB PERSO (A REMBOURSER)',
            'tva': 'TVA 20% : 12.15 EUR'
        },
        {
            'file': 'ticket-pharmacie-secours.jpg',
            'title': 'PHARMACIE CENTRALE DU PARC',
            'sub': '14 Place de la Mairie - 78120',
            'date': '02/11/2026 14:18:55',
            'lines': [
                ('3x COMPRESSES STERILES 10X10', '7.50'),
                ('1x BISEPTINE SPRAY 100ML', '5.80'),
                ('2x BANDE EXTENSIBLE 3M', '3.90'),
                ('1x PANSEMENTS WATERPROOF X40', '6.20'),
                ('1x ARNIGEL TUBE 45G', '4.80'),
                ('1x SERUM PHYSIOLOGIQUE X30', '3.20')
            ],
            'total': '31.40',
            'pay': 'CB PERSO (A REMBOURSER)',
            'tva': 'TVA 2.1% et 10% : 1.45 EUR'
        },
        {
            'file': 'facture-camping-hebergement.jpg',
            'title': 'CAMPING MUNICIPAL DES ECUREUILS',
            'sub': 'Foret de Rambouillet - Sejour scout',
            'date': '05/11/2026 10:00:00',
            'lines': [
                ('3x NUITEE EMPLACEMENT MEUTE', '105.00'),
                ('FORFAIT POINT EAU et BOIS FEU', '30.00'),
                ('TAXE DE SEJOUR SCOUTS JEUNES', '30.00')
            ],
            'total': '165.00',
            'pay': 'VIREMENT BANCAIRE GROUPE',
            'tva': 'TVA 10% : 15.00 EUR'
        }
    ]

    for r in receipts:
        y = 120
        lines_svg = ''
        for desc, price in r['lines']:
            lines_svg += f'<text x="20" y="{y}" font-family="monospace" font-size="12" fill="#111">{desc}</text>'
            if price:
                lines_svg += f'<text x="380" y="{y}" font-family="monospace" font-size="12" text-anchor="end" fill="#111">{price} EUR</text>'
            y += 24

        y += 10
        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="400" height="{y + 160}" viewBox="0 0 400 {y + 160}">
          <defs>
            <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#999" flood-opacity="0.3"/>
            </filter>
          </defs>
          <rect x="5" y="5" width="390" height="{y + 150}" rx="4" fill="#fcfbf7" stroke="#e5e0d8" stroke-width="2" filter="url(#shadow)"/>
          <text x="200" y="40" font-family="monospace" font-weight="bold" font-size="16" text-anchor="middle" fill="#111">{r['title']}</text>
          <text x="200" y="60" font-family="monospace" font-size="11" text-anchor="middle" fill="#555">{r['sub']}</text>
          <text x="200" y="80" font-family="monospace" font-size="11" text-anchor="middle" fill="#555">Date : {r['date']}</text>
          <line x1="20" y1="95" x2="380" y2="95" stroke="#222" stroke-dasharray="4,3" stroke-width="1.5"/>
          {lines_svg}
          <line x1="20" y1="{y}" x2="380" y2="{y}" stroke="#222" stroke-width="2"/>
          <text x="20" y="{y + 30}" font-family="monospace" font-weight="bold" font-size="18" fill="#111">TOTAL A PAYER :</text>
          <text x="380" y="{y + 30}" font-family="monospace" font-weight="bold" font-size="20" text-anchor="end" fill="#14532d">{r['total']} EUR</text>
          <text x="20" y="{y + 60}" font-family="monospace" font-size="11" fill="#444">Paiement : {r['pay']}</text>
          <text x="20" y="{y + 78}" font-family="monospace" font-size="10" fill="#666">{r['tva']}</text>
          <rect x="80" y="{y + 95}" width="240" height="28" fill="none" stroke="#111" stroke-width="1"/>
          <line x1="90" y1="{y + 98}" x2="90" y2="{y + 120}" stroke="#111" stroke-width="3"/>
          <line x1="98" y1="{y + 98}" x2="98" y2="{y + 120}" stroke="#111" stroke-width="1"/>
          <line x1="105" y1="{y + 98}" x2="105" y2="{y + 120}" stroke="#111" stroke-width="4"/>
          <line x1="115" y1="{y + 98}" x2="115" y2="{y + 120}" stroke="#111" stroke-width="2"/>
          <line x1="125" y1="{y + 98}" x2="125" y2="{y + 120}" stroke="#111" stroke-width="5"/>
          <line x1="140" y1="{y + 98}" x2="140" y2="{y + 120}" stroke="#111" stroke-width="2"/>
          <line x1="150" y1="{y + 98}" x2="150" y2="{y + 120}" stroke="#111" stroke-width="4"/>
          <line x1="165" y1="{y + 98}" x2="165" y2="{y + 120}" stroke="#111" stroke-width="1"/>
          <line x1="175" y1="{y + 98}" x2="175" y2="{y + 120}" stroke="#111" stroke-width="3"/>
          <line x1="185" y1="{y + 98}" x2="185" y2="{y + 120}" stroke="#111" stroke-width="6"/>
          <line x1="200" y1="{y + 98}" x2="200" y2="{y + 120}" stroke="#111" stroke-width="2"/>
          <line x1="215" y1="{y + 98}" x2="215" y2="{y + 120}" stroke="#111" stroke-width="4"/>
          <line x1="225" y1="{y + 98}" x2="225" y2="{y + 120}" stroke="#111" stroke-width="2"/>
          <line x1="235" y1="{y + 98}" x2="235" y2="{y + 120}" stroke="#111" stroke-width="5"/>
          <line x1="250" y1="{y + 98}" x2="250" y2="{y + 120}" stroke="#111" stroke-width="1"/>
          <line x1="260" y1="{y + 98}" x2="260" y2="{y + 120}" stroke="#111" stroke-width="3"/>
          <line x1="275" y1="{y + 98}" x2="275" y2="{y + 120}" stroke="#111" stroke-width="4"/>
          <line x1="290" y1="{y + 98}" x2="290" y2="{y + 120}" stroke="#111" stroke-width="2"/>
          <line x1="305" y1="{y + 98}" x2="305" y2="{y + 120}" stroke="#111" stroke-width="3"/>
          <text x="200" y="{y + 140}" font-family="monospace" font-size="10" text-anchor="middle" fill="#666">MERCI DE VOTRE VISITE - A BIENTOT</text>
        </svg>'''

        svg_path = os.path.join(out_dir, f"{r['file']}.svg")
        jpg_path = os.path.join(out_dir, r['file'])
        with open(svg_path, 'w', encoding='utf-8') as f:
            f.write(svg)
        subprocess.run(['convert', '-density', '150', svg_path, jpg_path], check=True)
        os.remove(svg_path)
        print(f"Facture réaliste générée : {jpg_path}")

if __name__ == '__main__':
    generate_all_receipts()
