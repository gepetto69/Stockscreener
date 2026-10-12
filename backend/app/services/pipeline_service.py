import logging
import math
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import yfinance as yf
from sqlalchemy.orm import Session
from app.models.stock import Company, FinancialStatement, StockPrice, QualityScore
from app.services.scoring_service import QualityScoringEngine

logger = logging.getLogger(__name__)

# Representative list of US and European Quality / Blue-chip / Compounder & Diversified stocks
CURATED_UNIVERSE = [
    # Corning Inc (GLW) - Featured in Databourse screenshots
    {
        "symbol": "GLW",
        "name": "Corning Inc",
        "sector": "Technology",
        "industry": "Hardware, Equipment & Parts",
        "country": "USA",
        "business_summary": "Corning Incorporated est un leader mondial en science des matériaux avec 175 ans d'histoire. L'entreprise conçoit et fabrique des produits innovants à base de verre, céramique et physique optique. Son activité principale tourne autour des communications optiques pour les data centers et réseaux, des verres protecteurs comme Gorilla Glass pour smartphones, des substrats pour écrans, des composants automobiles, des produits solaires et des solutions pour sciences de la vie et semi-conducteurs. Elle développe des innovations comme des fibres optiques multicoeurs et câbles haute densité optimisés pour l'IA. Ces produits transforment des industries en résolvant des problèmes techniques complexes grâce à une expertise unique en fabrication de précision.",
        "business_model": "Corning gagne de l'argent en vendant des produits à haute valeur ajoutée à des clients leaders mondiaux (comme Meta, Amazon, NVIDIA) via des contrats pluriannuels couvrant des besoins critiques d'infrastructures en data centers IA et optique avancée."
    },

    # US Mega-cap Tech & High Quality
    {
        "symbol": "MSFT", "name": "Microsoft Corporation", "sector": "Technology", "industry": "Software—Infrastructure", "country": "USA",
        "business_summary": "Microsoft Corporation est le géant mondial des logiciels d'entreprise, du cloud computing (Azure) et des solutions de productivité (Office 365, LinkedIn, GitHub). L'entreprise est un pionnier de l'intégration de l'intelligence artificielle générative à travers son partenariat stratégique avec OpenAI et le déploiement de Copilot dans tous ses écosystèmes applicatifs.",
        "business_model": "Modèle économique récurrent d'abonnements logiciels en SaaS (Software as a Service), consommation d'infrastructures cloud Azure à l'usage, licences d'exploitation et ventes de jeux/consoles Xbox."
    },
    {
        "symbol": "AAPL", "name": "Apple Inc.", "sector": "Technology", "industry": "Consumer Electronics", "country": "USA",
        "business_summary": "Apple Inc. conçoit, fabrique et commercialise des smartphones haut de gamme (iPhone), des tablettes (iPad), des ordinateurs personnels (Mac), des montres connectées (Apple Watch) et des accessoires. Elle opère également l'un des écosystèmes de services numériques les plus rentables au monde (App Store, Apple Music, iCloud, Apple Pay).",
        "business_model": "Vente de matériel haut de gamme à marges brutes élevées couplée à la monétisation croissante de sa base installée active de plus de 2 milliards d'appareils via des abonnements et commissions de services numériques."
    },
    {
        "symbol": "GOOGL", "name": "Alphabet Inc.", "sector": "Communication Services", "industry": "Internet Content & Information", "country": "USA",
        "business_summary": "Alphabet Inc. est la maison mère de Google, leader mondial absolu de la recherche en ligne, de la vidéo (YouTube), des systèmes d'exploitation mobiles (Android) et des services cloud (Google Cloud Platform). L'entreprise investit massivement dans les modèles de fondation IA (Gemini) et la conduite autonome (Waymo).",
        "business_model": "Monétisation d'un trafic mondial inégalé par la publicité numérique ciblée (Google Search, YouTube Ads, Réseau Display), complétée par les abonnements cloud d'entreprise (GCP) et services payants (YouTube Premium, Workspace)."
    },
    {
        "symbol": "NVDA", "name": "NVIDIA Corporation", "sector": "Technology", "industry": "Semiconductors", "country": "USA",
        "business_summary": "NVIDIA est le leader mondial incontesté des processeurs graphiques (GPU) et plateformes de calcul accéléré pour l'entraînement et l'inférence des modèles d'intelligence artificielle, les centres de données hyperscale, la simulation scientifique et le gaming haute performance.",
        "business_model": "Vente de puces ultra haute performance (H100, B200 Blackwell) avec un pricing power exceptionnel, architecture réseau complète (InfiniBand) et verrouillage logiciel propriétaire via l'écosystème CUDA."
    },
    {
        "symbol": "AMZN", "name": "Amazon.com, Inc.", "sector": "Consumer Cyclical", "industry": "Internet Retail", "country": "USA",
        "business_summary": "Amazon.com, Inc. est un leader technologique mondial incontournable dans le commerce en ligne, le cloud computing (Amazon Web Services - AWS), la publicité numérique et les abonnements Prime. AWS est le moteur de rentabilité du groupe et l'infrastructure cloud dominante pour les déploiements d'entreprises et d'IA générative.",
        "business_model": "Modèle économique ultra-robuste combinant les marges opérationnelles élevées d'AWS, les flux récurrents des abonnements Prime, l'hyper-croissance de la régie publicitaire et la marketplace logistique mondiale."
    },
    {
        "symbol": "META", "name": "Meta Platforms, Inc.", "sector": "Communication Services", "industry": "Internet Content & Information", "country": "USA",
        "business_summary": "Meta Platforms, Inc. est le leader planétaire des réseaux sociaux et de la communication digitale (Facebook, Instagram, WhatsApp, Messenger, Threads). L'entreprise réunit plus de 3 milliards d'utilisateurs actifs quotidiens et investit massivement dans les modèles de fondation IA (Llama) et les technologies d'informatique spatiale.",
        "business_model": "Monétisation d'un engagement utilisateur sans équivalent par la publicité numérique ciblée à très forte marge, générant des dizaines de milliards de dollars de Free Cash Flow annuel et des rachats massifs d'actions."
    },
    {
        "symbol": "TSLA", "name": "Tesla, Inc.", "sector": "Consumer Cyclical", "industry": "Auto Manufacturers", "country": "USA",
        "business_summary": "Tesla, Inc. est le pionnier et leader mondial de la mobilité électrique (Model Y, Model 3, Cybertruck), du stockage d'énergie renouvelable par batteries stationnaires (Megapack, Powerwall) et du calcul accéléré pour la conduite autonome (FSD) et la robotique autonome (Optimus).",
        "business_model": "Vente de véhicules électriques connectés à marge brute industrielle supérieure, services logiciels récurrents de connectivité et de conduite autonome (Full Self-Driving), réseau propriétaire de recharge Supercharger et déploiement mondial de stockage énergétique."
    },
    {
        "symbol": "ASML", "name": "ASML Holding N.V.", "sector": "Technology", "industry": "Semiconductor Equipment", "country": "Netherlands",
        "business_summary": "ASML est le fabricant mondial exclusif de systèmes de lithographie extrême ultraviolet (EUV) indispensables à la gravure des puces semi-conductrices les plus avancées (TSMC, Intel, Samsung). L'entreprise dispose d'un monopole technologique absolu sur le segment le plus stratégique de l'électronique moderne.",
        "business_model": "Vente de machines industrielles ultra complexes à plusieurs centaines de millions d'euros par unité, assortie de contrats de maintenance, de mise à niveau logicielle et de pièces détachées pluriannuels à marges très élevées."
    },
    
    # Healthcare & Pharma
    {
        "symbol": "JNJ", "name": "Johnson & Johnson", "sector": "Healthcare", "industry": "Drug Manufacturers—General", "country": "USA",
        "business_summary": "Johnson & Johnson est un conglomérat de santé de premier plan mondial, spécialisé dans les médicaments innovants (oncologie, immunologie, neurosciences) et les technologies médicales de pointe (chirurgie robotique, implants orthopédiques, cardiologie interventionnelle).",
        "business_model": "Ventes de traitements brevetés sous prescription médicale à forte valeur ajoutée et fournitures hospitalières spécialisées assurant des flux de trésorerie défensifs insensibles aux cycles macroéconomiques."
    },
    {
        "symbol": "NVO", "name": "Novo Nordisk A/S", "sector": "Healthcare", "industry": "Biotechnology", "country": "Denmark",
        "business_summary": "Novo Nordisk est le leader mondial historique et incontesté des traitements du diabète et des thérapies contre l'obésité grâce à ses molécules révolutionnaires agonistes GLP-1 (Ozempic et Wegovy).",
        "business_model": "Vente de traitements injectables et oraux pour maladies chroniques avec un taux d'adhésion patient à très long terme, garantissant une croissance soutenue et des marges nettes exceptionnelles."
    },
    {
        "symbol": "UNH", "name": "UnitedHealth Group Incorporated", "sector": "Healthcare", "industry": "Healthcare Plans", "country": "USA",
        "business_summary": "UnitedHealth Group est le premier assureur et gestionnaire de soins de santé aux États-Unis. Il opère à travers deux piliers : UnitedHealthcare (couverture d'assurance santé) et Optum (services technologiques de santé, pharmacies spécialisées et cliniques de soins).",
        "business_model": "Primes d'assurance santé récurrentes prélevées sur des dizaines de millions de bénéficiaires intégrées à la prestation directe de soins et de données cliniques via la division Optum."
    },
    
    # Consumer & Retail Compounders
    {
        "symbol": "COST", "name": "Costco Wholesale Corporation", "sector": "Consumer Defensive", "industry": "Discount Stores", "country": "USA",
        "business_summary": "Costco Wholesale est le premier opérateur mondial de magasins-entrepôts sur abonnement. Il propose une sélection resserrée de produits de qualité à prix quasi-coûtant pour fidéliser une communauté de membres fidèles.",
        "business_model": "Génération de la quasi-totalité de son résultat d'exploitation via les cotisations annuelles d'adhésion (taux de renouvellement supérieur à 92%), vendant les marchandises avec des marges réduites pour garantir le volume."
    },
    {
        "symbol": "PG", "name": "The Procter & Gamble Company", "sector": "Consumer Defensive", "industry": "Household & Personal Products", "country": "USA",
        "business_summary": "Procter & Gamble est le géant mondial des biens de grande consommation courante, propriétaire de marques iconiques mondiales (Gillette, Ariel, Pampers, Oral-B, Head & Shoulders).",
        "business_model": "Distribution mondiale à très grande échelle de produits du quotidien avec un fort pouvoir de fixation des prix (pricing power) et une fidélité de marque transgénérationnelle."
    },
    {
        "symbol": "KO", "name": "The Coca-Cola Company", "sector": "Consumer Defensive", "industry": "Beverages—Non-Alcoholic", "country": "USA",
        "business_summary": "The Coca-Cola Company est la plus grande entreprise mondiale de boissons sans alcool, détenant plus de 200 marques de sodas, eaux, jus, thés et cafés vendus dans plus de 200 pays.",
        "business_model": "Modèle d'embouteillage franchisé capital-light : vente de concentrés et sirops à des embouteilleurs partenaires indépendants avec d'immenses marges d'exploitation et un dividende croissant depuis plus de 60 ans."
    },
    {
        "symbol": "MCD", "name": "McDonald's Corporation", "sector": "Consumer Cyclical", "industry": "Restaurants", "country": "USA",
        "business_summary": "McDonald's est la chaîne de restauration rapide la plus puissante au monde avec plus de 40 000 restaurants répartis sur tous les continents.",
        "business_model": "Modèle hybride franchise et foncière immobilière : McDonald's possède les terrains et murs des restaurants et encaisse des loyers indexés sur le chiffre d'affaires ainsi que des redevances de franchise récurrentes."
    },
    {
        "symbol": "OR.PA", "name": "L'Oréal S.A.", "sector": "Consumer Defensive", "industry": "Household & Personal Products", "country": "France",
        "business_summary": "L'Oréal est le champion mondial absolu de la beauté et des cosmétiques (soins de la peau, maquillage, parfums, soins capillaires) à travers un portefeuille d'exception (Lancôme, Yves Saint Laurent, La Roche-Posay, CeraVe).",
        "business_model": "Recherche dermatologique de pointe et marketing d'influence mondial permettant d'imposer des prix premium et d'enregistrer des marges opérationnelles constamment supérieures à 20%."
    },
    {
        "symbol": "MC.PA", "name": "LVMH Moët Hennessy Louis Vuitton", "sector": "Consumer Cyclical", "industry": "Luxury Goods", "country": "France",
        "business_summary": "LVMH est le numéro un mondial incontesté du luxe, fédérant 75 Maisons prestigieuses dans les vins & spiritueux, la mode & maroquinerie (Louis Vuitton, Christian Dior), les parfums, et les montres & joaillerie (Tiffany & Co., Bulgari).",
        "business_model": "Désirabilité absolue et contrôle total de la chaîne de distribution artisanale permettant une absence totale de remises commerciales et des marges brutes de niveau mondial."
    },
    {
        "symbol": "RMS.PA", "name": "Hermès International S.A.", "sector": "Consumer Cyclical", "industry": "Luxury Goods", "country": "France",
        "business_summary": "Hermès International incarne le sommet du luxe ultra-exclusif artisanal français, célèbre dans le monde entier pour ses sacs iconiques Birkin et Kelly, sa sellerie et ses carrés de soie.",
        "business_model": "Rareté méticuleusement entretenue avec listes d'attente pluriannuelles, production 100% artisanale en France et marges opérationnelles record supérieures à 40% sans jamais recourir aux promotions."
    },

    # Industrials & Payments
    {
        "symbol": "V", "name": "Visa Inc.", "sector": "Financial Services", "industry": "Credit Services", "country": "USA",
        "business_summary": "Visa Inc. exploite le plus grand réseau mondial de paiement électronique (VisaNet), connectant consommateurs, commerçants, institutions financières et gouvernements dans plus de 200 pays.",
        "business_model": "Péage numérique sans risque de crédit : prélèvement d'une fraction de centime ou d'un pourcentage fixe sur chaque transaction électronique validée, dégageant une marge d'exploitation de plus de 65%."
    },
    {
        "symbol": "MA", "name": "Mastercard Incorporated", "sector": "Financial Services", "industry": "Credit Services", "country": "USA",
        "business_summary": "Mastercard est le duopole mondial du paiement dématérialisé aux côtés de Visa, offrant des infrastructures de compensation de paiement et des solutions avancées de cybersécurité et de scoring bancaire.",
        "business_model": "Modèle de réseau à rendements d'échelle croissants où chaque transaction supplémentaire génère un profit marginal presque pur."
    },
    {
        "symbol": "AIR.PA", "name": "Airbus SE", "sector": "Industrials", "industry": "Aerospace & Defense", "country": "France",
        "business_summary": "Airbus SE est le premier constructeur aéronautique mondial d'avions commerciaux (familles A320neo, A350), d'hélicoptères et de systèmes de défense et spatiaux.",
        "business_model": "Carnet de commandes pluriannuel garanti sur plus de 10 ans de production (plus de 8 000 avions en carnet), vendant des appareils à forte intensité technologique assortis de services de maintenance."
    },
    {
        "symbol": "SU.PA", "name": "Schneider Electric S.E.", "sector": "Industrials", "industry": "Specialty Industrial Machinery", "country": "France",
        "business_summary": "Schneider Electric est le leader mondial de la gestion de l'énergie électrique et des automatismes industriels, au coeur des méga-tendances de l'électrification mondiale et des data centers IA.",
        "business_model": "Vente combinée d'équipements électriques critiques et de suites logicielles industrielles (EcoStruxure) assurant une efficacité énergétique maximale pour les industries et data centers."
    },
    {
        "symbol": "SAN.PA", "name": "Sanofi S.A.", "sector": "Healthcare", "industry": "Drug Manufacturers—General", "country": "France",
        "business_summary": "Sanofi est un laboratoire pharmaceutique mondial innovant, propulsé par son blockbuster d'immunologie Dupixent et un portefeuille leader en vaccins et thérapies ciblées.",
        "business_model": "Commercialisation mondiale de traitements brevetés pour maladies chroniques et immunologiques avec un déploiement continu dans de nouvelles indications thérapeutiques."
    }
]

# High quality synthetic data fallback for robust local demonstrations & tests
FALLBACK_FINANCIAL_PROFILES = {
    "GLW": {
        "pe": 34.2, "pfcf": 28.5, "price": 205.79, "mcap": 175000000000, "yield": 1.45,
        "years": [
            {"year": 2020, "rev": 11300, "op_inc": 1550, "ebitda": 2350, "ni": 1050, "eps": 1.25, "fcf": 950, "debt": 7900, "cash": 2200, "assets": 27500, "equity": 11800, "cur_a": 6200, "cur_l": 4100, "div": 720},
            {"year": 2021, "rev": 14082, "op_inc": 2240, "ebitda": 3200, "ni": 1906, "eps": 2.07, "fcf": 1780, "debt": 7700, "cash": 2400, "assets": 29800, "equity": 12600, "cur_a": 6900, "cur_l": 4400, "div": 810},
            {"year": 2022, "rev": 14805, "op_inc": 2180, "ebitda": 3100, "ni": 1316, "eps": 1.54, "fcf": 1240, "debt": 7800, "cash": 2100, "assets": 30200, "equity": 12900, "cur_a": 6700, "cur_l": 4300, "div": 920},
            {"year": 2023, "rev": 13578, "op_inc": 1820, "ebitda": 2750, "ni": 1180, "eps": 1.38, "fcf": 1100, "debt": 7900, "cash": 2150, "assets": 30400, "equity": 13200, "cur_a": 6800, "cur_l": 4350, "div": 950},
            {"year": 2024, "rev": 15450, "op_inc": 2480, "ebitda": 3450, "ni": 1420, "eps": 1.70, "fcf": 1420, "debt": 10032, "cash": 2200, "assets": 32000, "equity": 13200, "cur_a": 7000, "cur_l": 4350, "div": 980},
        ]
    },
    "MSFT": {
        "pe": 32.5, "pfcf": 28.0, "price": 420.0, "mcap": 3120000000000, "yield": 0.75,
        "years": [
            {"year": 2020, "rev": 143015, "op_inc": 52959, "ebitda": 65755, "ni": 44281, "eps": 5.76, "fcf": 45234, "debt": 70998, "cash": 136527, "assets": 301311, "equity": 118304, "cur_a": 181915, "cur_l": 72310, "div": 15000},
            {"year": 2021, "rev": 168088, "op_inc": 69916, "ebitda": 80816, "ni": 61271, "eps": 8.05, "fcf": 56118, "debt": 67775, "cash": 130334, "assets": 333779, "equity": 141988, "cur_a": 184406, "cur_l": 88657, "div": 16500},
            {"year": 2022, "rev": 198270, "op_inc": 83383, "ebitda": 97843, "ni": 72738, "eps": 9.65, "fcf": 65149, "debt": 61270, "cash": 104750, "assets": 364840, "equity": 166542, "cur_a": 169684, "cur_l": 95082, "div": 18000},
            {"year": 2023, "rev": 211915, "op_inc": 88523, "ebitda": 102384, "ni": 72361, "eps": 9.68, "fcf": 59475, "debt": 59965, "cash": 111262, "assets": 411976, "equity": 206223, "cur_a": 184257, "cur_l": 104149, "div": 19800},
            {"year": 2024, "rev": 245122, "op_inc": 109433, "ebitda": 125500, "ni": 88136, "eps": 11.80, "fcf": 74071, "debt": 58000, "cash": 107000, "assets": 512163, "equity": 268458, "cur_a": 205000, "cur_l": 115000, "div": 21800},
        ]
    },
    "AAPL": {
        "pe": 29.8, "pfcf": 26.5, "price": 225.0, "mcap": 3450000000000, "yield": 0.50,
        "years": [
            {"year": 2020, "rev": 274515, "op_inc": 66288, "ebitda": 77344, "ni": 57411, "eps": 3.28, "fcf": 73365, "debt": 112436, "cash": 90943, "assets": 323888, "equity": 65339, "cur_a": 143713, "cur_l": 105392, "div": 14000},
            {"year": 2021, "rev": 365817, "op_inc": 108949, "ebitda": 120233, "ni": 94680, "eps": 5.61, "fcf": 92953, "debt": 124719, "cash": 62639, "assets": 351002, "equity": 63090, "cur_a": 134836, "cur_l": 125481, "div": 14500},
            {"year": 2022, "rev": 394328, "op_inc": 119437, "ebitda": 130541, "ni": 99803, "eps": 6.11, "fcf": 111443, "debt": 120069, "cash": 48304, "assets": 352755, "equity": 50672, "cur_a": 135405, "cur_l": 153982, "div": 14800},
            {"year": 2023, "rev": 383285, "op_inc": 114301, "ebitda": 125820, "ni": 96995, "eps": 6.13, "fcf": 99584, "debt": 111088, "cash": 61555, "assets": 352583, "equity": 62146, "cur_a": 143566, "cur_l": 145308, "div": 15000},
            {"year": 2024, "rev": 391035, "op_inc": 123216, "ebitda": 134500, "ni": 101000, "eps": 6.60, "fcf": 108000, "debt": 106000, "cash": 65000, "assets": 365000, "equity": 66000, "cur_a": 152000, "cur_l": 140000, "div": 15500},
        ]
    },
    "GOOGL": {
        "pe": 17.64, "pfcf": 20.5, "price": 351.66, "mcap": 4301000000000, "yield": 0.25,
        "years": [
            {"year": 2020, "rev": 182527, "op_inc": 41224, "ebitda": 54629, "ni": 40269, "eps": 8.05, "fcf": 42843, "debt": 27213, "cash": 136694, "assets": 319616, "equity": 222544, "cur_a": 174296, "cur_l": 44283, "div": 0},
            {"year": 2021, "rev": 257637, "op_inc": 78714, "ebitda": 91155, "ni": 76033, "eps": 15.20, "fcf": 67012, "debt": 28504, "cash": 139649, "assets": 359268, "equity": 251635, "cur_a": 188143, "cur_l": 64254, "div": 0},
            {"year": 2022, "rev": 282836, "op_inc": 74842, "ebitda": 90770, "ni": 59972, "eps": 12.10, "fcf": 60010, "debt": 29699, "cash": 113762, "assets": 365264, "equity": 256144, "cur_a": 164805, "cur_l": 69300, "div": 0},
            {"year": 2023, "rev": 307394, "op_inc": 84293, "ebitda": 102000, "ni": 73795, "eps": 14.80, "fcf": 69494, "debt": 28000, "cash": 110916, "assets": 402392, "equity": 283388, "cur_a": 177432, "cur_l": 78000, "div": 0},
            {"year": 2024, "rev": 350000, "op_inc": 118000, "ebitda": 142000, "ni": 100000, "eps": 19.93, "fcf": 88000, "debt": 26000, "cash": 118000, "assets": 450000, "equity": 330000, "cur_a": 205000, "cur_l": 85000, "div": 2500},
        ]
    },
    "AMZN": {
        "pe": 21.1, "pfcf": 24.5, "price": 262.43, "mcap": 2830000000000, "yield": 0.0,
        "years": [
            {"year": 2020, "rev": 386064, "op_inc": 22899, "ebitda": 48000, "ni": 21331, "eps": 2.09, "fcf": 25924, "debt": 84389, "cash": 84396, "assets": 321195, "equity": 93404, "cur_a": 132733, "cur_l": 126385, "div": 0},
            {"year": 2021, "rev": 469822, "op_inc": 24879, "ebitda": 59100, "ni": 33364, "eps": 3.24, "fcf": -14726, "debt": 116395, "cash": 96049, "assets": 420549, "equity": 138245, "cur_a": 161580, "cur_l": 142266, "div": 0},
            {"year": 2022, "rev": 513983, "op_inc": 12248, "ebitda": 54100, "ni": -2722, "eps": -0.27, "fcf": -16893, "debt": 140118, "cash": 70026, "assets": 462675, "equity": 146043, "cur_a": 146791, "cur_l": 155393, "div": 0},
            {"year": 2023, "rev": 574785, "op_inc": 36852, "ebitda": 85500, "ni": 30425, "eps": 2.90, "fcf": 36800, "debt": 135000, "cash": 86780, "assets": 527854, "equity": 201875, "cur_a": 172000, "cur_l": 165000, "div": 0},
            {"year": 2024, "rev": 638000, "op_inc": 60500, "ebitda": 115000, "ni": 48000, "eps": 4.55, "fcf": 52000, "debt": 128000, "cash": 92000, "assets": 590000, "equity": 260000, "cur_a": 195000, "cur_l": 175000, "div": 0},
        ]
    },
    "META": {
        "pe": 27.1, "pfcf": 25.0, "price": 718.67, "mcap": 1830000000000, "yield": 0.35,
        "years": [
            {"year": 2020, "rev": 85965, "op_inc": 34203, "ebitda": 43000, "ni": 29146, "eps": 10.09, "fcf": 23632, "debt": 10600, "cash": 61954, "assets": 159316, "equity": 128290, "cur_a": 75670, "cur_l": 14981, "div": 0},
            {"year": 2021, "rev": 117929, "op_inc": 46753, "ebitda": 54720, "ni": 39370, "eps": 13.77, "fcf": 38439, "debt": 13800, "cash": 47998, "assets": 165987, "equity": 124879, "cur_a": 66666, "cur_l": 21135, "div": 0},
            {"year": 2022, "rev": 116609, "op_inc": 28944, "ebitda": 37800, "ni": 23200, "eps": 8.59, "fcf": 18439, "debt": 27000, "cash": 40700, "assets": 185727, "equity": 125713, "cur_a": 59549, "cur_l": 27026, "div": 0},
            {"year": 2023, "rev": 134902, "op_inc": 46751, "ebitda": 61000, "ni": 39098, "eps": 14.87, "fcf": 43000, "debt": 37000, "cash": 65400, "assets": 229623, "equity": 153170, "cur_a": 85000, "cur_l": 34000, "div": 0},
            {"year": 2024, "rev": 164000, "op_inc": 69000, "ebitda": 88000, "ni": 58000, "eps": 22.50, "fcf": 53000, "debt": 38000, "cash": 72000, "assets": 275000, "equity": 190000, "cur_a": 105000, "cur_l": 40000, "div": 4500},
        ]
    },
    "TSLA": {
        "pe": 354.0, "pfcf": 85.0, "price": 382.70, "mcap": 1511000000000, "yield": 0.0,
        "years": [
            {"year": 2020, "rev": 31536, "op_inc": 1994, "ebitda": 4224, "ni": 721, "eps": 0.25, "fcf": 2701, "debt": 11688, "cash": 19384, "assets": 52148, "equity": 22225, "cur_a": 26717, "cur_l": 14248, "div": 0},
            {"year": 2021, "rev": 53823, "op_inc": 6523, "ebitda": 9598, "ni": 5519, "eps": 1.63, "fcf": 3483, "debt": 6834, "cash": 17576, "assets": 62131, "equity": 30189, "cur_a": 27100, "cur_l": 19705, "div": 0},
            {"year": 2022, "rev": 81462, "op_inc": 13656, "ebitda": 17660, "ni": 12583, "eps": 3.62, "fcf": 7566, "debt": 3099, "cash": 22185, "assets": 82338, "equity": 44704, "cur_a": 40917, "cur_l": 26709, "div": 0},
            {"year": 2023, "rev": 96773, "op_inc": 8891, "ebitda": 14700, "ni": 14997, "eps": 4.30, "fcf": 4358, "debt": 4800, "cash": 29094, "assets": 106618, "equity": 62634, "cur_a": 49616, "cur_l": 28748, "div": 0},
            {"year": 2024, "rev": 99500, "op_inc": 9200, "ebitda": 15500, "ni": 7800, "eps": 2.25, "fcf": 4100, "debt": 5200, "cash": 33000, "assets": 118000, "equity": 71000, "cur_a": 55000, "cur_l": 31000, "div": 0},
        ]
    },
    "NVO": {
        "pe": 34.0, "pfcf": 31.0, "price": 120.0, "mcap": 540000000000, "yield": 1.4,
        "years": [
            {"year": 2020, "rev": 126946, "op_inc": 54126, "ebitda": 60500, "ni": 42138, "eps": 18.2, "fcf": 35200, "debt": 22000, "cash": 15000, "assets": 144000, "equity": 63000, "cur_a": 65000, "cur_l": 45000, "div": 21000},
            {"year": 2021, "rev": 140800, "op_inc": 58644, "ebitda": 65200, "ni": 47757, "eps": 20.7, "fcf": 41000, "debt": 24000, "cash": 18000, "assets": 160000, "equity": 71000, "cur_a": 72000, "cur_l": 52000, "div": 24000},
            {"year": 2022, "rev": 176954, "op_inc": 74809, "ebitda": 82000, "ni": 55525, "eps": 24.4, "fcf": 53000, "debt": 28000, "cash": 22000, "assets": 190000, "equity": 83000, "cur_a": 85000, "cur_l": 62000, "div": 28000},
            {"year": 2023, "rev": 232261, "op_inc": 102254, "ebitda": 112000, "ni": 83683, "eps": 37.2, "fcf": 75000, "debt": 32000, "cash": 28000, "assets": 245000, "equity": 108000, "cur_a": 110000, "cur_l": 78000, "div": 42000},
            {"year": 2024, "rev": 290000, "op_inc": 128000, "ebitda": 139000, "ni": 102000, "eps": 45.5, "fcf": 92000, "debt": 35000, "cash": 34000, "assets": 295000, "equity": 135000, "cur_a": 135000, "cur_l": 92000, "div": 52000},
        ]
    },
    "RMS.PA": {
        "pe": 45.0, "pfcf": 42.0, "price": 2050.0, "mcap": 215000000000, "yield": 0.8,
        "years": [
            {"year": 2020, "rev": 6389, "op_inc": 1981, "ebitda": 2480, "ni": 1385, "eps": 13.2, "fcf": 995, "debt": 1800, "cash": 4800, "assets": 10500, "equity": 7500, "cur_a": 6500, "cur_l": 1800, "div": 476},
            {"year": 2021, "rev": 8982, "op_inc": 3530, "ebitda": 4100, "ni": 2445, "eps": 23.3, "fcf": 2661, "debt": 1900, "cash": 6900, "assets": 13200, "equity": 9800, "cur_a": 8900, "cur_l": 2200, "div": 840},
            {"year": 2022, "rev": 11602, "op_inc": 4697, "ebitda": 5300, "ni": 3377, "eps": 32.2, "fcf": 3406, "debt": 2100, "cash": 9400, "assets": 16500, "equity": 12400, "cur_a": 11500, "cur_l": 2800, "div": 1360},
            {"year": 2023, "rev": 13427, "op_inc": 5650, "ebitda": 6350, "ni": 4311, "eps": 41.1, "fcf": 4115, "debt": 2200, "cash": 11200, "assets": 19800, "equity": 15200, "cur_a": 13800, "cur_l": 3200, "div": 1600},
            {"year": 2024, "rev": 15150, "op_inc": 6420, "ebitda": 7200, "ni": 4900, "eps": 46.8, "fcf": 4650, "debt": 2300, "cash": 13000, "assets": 22800, "equity": 18000, "cur_a": 16200, "cur_l": 3600, "div": 1900},
        ]
    },
    "V": {
        "pe": 28.5, "pfcf": 25.0, "price": 285.0, "mcap": 575000000000, "yield": 0.8,
        "years": [
            {"year": 2020, "rev": 21846, "op_inc": 14081, "ebitda": 14886, "ni": 10866, "eps": 4.90, "fcf": 9704, "debt": 21071, "cash": 19800, "assets": 80919, "equity": 36210, "cur_a": 27424, "cur_l": 15300, "div": 2700},
            {"year": 2021, "rev": 24105, "op_inc": 15803, "ebitda": 16600, "ni": 12311, "eps": 5.63, "fcf": 14522, "debt": 20993, "cash": 20100, "assets": 82896, "equity": 37624, "cur_a": 28500, "cur_l": 16800, "div": 3000},
            {"year": 2022, "rev": 29310, "op_inc": 18813, "ebitda": 19700, "ni": 14957, "eps": 7.00, "fcf": 17882, "debt": 22500, "cash": 18900, "assets": 85501, "equity": 35579, "cur_a": 27200, "cur_l": 18500, "div": 3200},
            {"year": 2023, "rev": 32653, "op_inc": 21314, "ebitda": 22400, "ni": 17273, "eps": 8.28, "fcf": 19720, "debt": 21500, "cash": 20500, "assets": 90500, "equity": 38800, "cur_a": 29800, "cur_l": 20100, "div": 3750},
            {"year": 2024, "rev": 35929, "op_inc": 23600, "ebitda": 24800, "ni": 19700, "eps": 9.50, "fcf": 21800, "debt": 21000, "cash": 22000, "assets": 95000, "equity": 42000, "cur_a": 32000, "cur_l": 21000, "div": 4200},
        ]
    },
    "NVDA": {
        "pe": 42.0, "pfcf": 38.0, "price": 128.0, "mcap": 3150000000000, "yield": 0.1,
        "years": [
            {"year": 2020, "rev": 10918, "op_inc": 2846, "ebitda": 3270, "ni": 2796, "eps": 0.45, "fcf": 4272, "debt": 2600, "cash": 10896, "assets": 17315, "equity": 12204, "cur_a": 13400, "cur_l": 1780, "div": 390},
            {"year": 2021, "rev": 16675, "op_inc": 4532, "ebitda": 5690, "ni": 4332, "eps": 0.69, "fcf": 4694, "debt": 6900, "cash": 11561, "assets": 28791, "equity": 16893, "cur_a": 16000, "cur_l": 3920, "div": 395},
            {"year": 2022, "rev": 26914, "op_inc": 10041, "ebitda": 11220, "ni": 9752, "eps": 1.55, "fcf": 8132, "debt": 10946, "cash": 21208, "assets": 44187, "equity": 26612, "cur_a": 28800, "cur_l": 4370, "div": 399},
            {"year": 2023, "rev": 26974, "op_inc": 4224, "ebitda": 5600, "ni": 4368, "eps": 0.70, "fcf": 3808, "debt": 11000, "cash": 13296, "assets": 41182, "equity": 22101, "cur_a": 23000, "cur_l": 6500, "div": 398},
            {"year": 2024, "rev": 60922, "op_inc": 32972, "ebitda": 34500, "ni": 29760, "eps": 4.75, "fcf": 27021, "debt": 10500, "cash": 25984, "assets": 65728, "equity": 42978, "cur_a": 44345, "cur_l": 10631, "div": 395},
        ]
    },
    "COST": {
        "pe": 50.0, "pfcf": 45.0, "price": 890.0, "mcap": 395000000000, "yield": 0.6,
        "years": [
            {"year": 2020, "rev": 166761, "op_inc": 5435, "ebitda": 6700, "ni": 4002, "eps": 9.02, "fcf": 6050, "debt": 7500, "cash": 13300, "assets": 55556, "equity": 18705, "cur_a": 28100, "cur_l": 25200, "div": 1200},
            {"year": 2021, "rev": 195929, "op_inc": 6708, "ebitda": 8200, "ni": 5007, "eps": 11.27, "fcf": 5350, "debt": 7600, "cash": 12175, "assets": 59268, "equity": 17564, "cur_a": 29800, "cur_l": 27600, "div": 1350},
            {"year": 2022, "rev": 226954, "op_inc": 7793, "ebitda": 9400, "ni": 5844, "eps": 13.14, "fcf": 3310, "debt": 7200, "cash": 11050, "assets": 64166, "equity": 20680, "cur_a": 32700, "cur_l": 32000, "div": 1500},
            {"year": 2023, "rev": 242290, "op_inc": 8114, "ebitda": 9900, "ni": 6292, "eps": 14.16, "fcf": 6700, "debt": 7000, "cash": 13700, "assets": 68994, "equity": 25528, "cur_a": 36000, "cur_l": 33500, "div": 1750},
            {"year": 2024, "rev": 254450, "op_inc": 9250, "ebitda": 11200, "ni": 7367, "eps": 16.56, "fcf": 7500, "debt": 6900, "cash": 15200, "assets": 74000, "equity": 29000, "cur_a": 39500, "cur_l": 35000, "div": 2000},
        ]
    },
    "MC.PA": {
        "pe": 22.0, "pfcf": 21.0, "price": 630.0, "mcap": 315000000000, "yield": 2.1,
        "years": [
            {"year": 2020, "rev": 44651, "op_inc": 8305, "ebitda": 13800, "ni": 4702, "eps": 9.33, "fcf": 4180, "debt": 19000, "cash": 8000, "assets": 105000, "equity": 38800, "cur_a": 27000, "cur_l": 24000, "div": 2000},
            {"year": 2021, "rev": 64215, "op_inc": 17151, "ebitda": 23500, "ni": 12036, "eps": 23.90, "fcf": 13531, "debt": 18000, "cash": 10500, "assets": 123000, "equity": 48900, "cur_a": 35000, "cur_l": 31000, "div": 3500},
            {"year": 2022, "rev": 79184, "op_inc": 21055, "ebitda": 28100, "ni": 14084, "eps": 28.05, "fcf": 10113, "debt": 17500, "cash": 9800, "assets": 134000, "equity": 56600, "cur_a": 41000, "cur_l": 35000, "div": 6000},
            {"year": 2023, "rev": 86153, "op_inc": 22802, "ebitda": 30200, "ni": 15174, "eps": 30.33, "fcf": 8104, "debt": 20000, "cash": 11000, "assets": 143000, "equity": 62700, "cur_a": 45000, "cur_l": 38000, "div": 6500},
            {"year": 2024, "rev": 84500, "op_inc": 20800, "ebitda": 28000, "ni": 13800, "eps": 27.60, "fcf": 8500, "debt": 19500, "cash": 11500, "assets": 145000, "equity": 65000, "cur_a": 46000, "cur_l": 39000, "div": 6500},
        ]
    },
    "JNJ": {
        "pe": 16.5, "pfcf": 18.0, "price": 160.0, "mcap": 385000000000, "yield": 3.1,
        "years": [
            {"year": 2020, "rev": 82584, "op_inc": 16497, "ebitda": 27000, "ni": 14714, "eps": 5.51, "fcf": 20165, "debt": 35000, "cash": 25000, "assets": 174000, "equity": 63000, "cur_a": 55000, "cur_l": 40000, "div": 10500},
            {"year": 2021, "rev": 93775, "op_inc": 22776, "ebitda": 31000, "ni": 20878, "eps": 7.81, "fcf": 19756, "debt": 33000, "cash": 31000, "assets": 182000, "equity": 74000, "cur_a": 60000, "cur_l": 43000, "div": 11000},
            {"year": 2022, "rev": 94943, "op_inc": 21827, "ebitda": 30500, "ni": 17941, "eps": 6.73, "fcf": 17200, "debt": 39000, "cash": 23000, "assets": 187000, "equity": 76000, "cur_a": 58000, "cur_l": 47000, "div": 11700},
            {"year": 2023, "rev": 85159, "op_inc": 21400, "ebitda": 29800, "ni": 13326, "eps": 5.20, "fcf": 18000, "debt": 34000, "cash": 22000, "assets": 170000, "equity": 69000, "cur_a": 54000, "cur_l": 44000, "div": 11800},
            {"year": 2024, "rev": 88000, "op_inc": 22500, "ebitda": 31000, "ni": 15500, "eps": 6.45, "fcf": 19200, "debt": 33000, "cash": 23000, "assets": 173000, "equity": 71000, "cur_a": 56000, "cur_l": 45000, "div": 12200},
        ]
    },
    "AIR.PA": {
        "pe": 26.0, "pfcf": 28.0, "price": 135.0, "mcap": 105000000000, "yield": 1.4,
        "years": [
            {"year": 2020, "rev": 49912, "op_inc": -510, "ebitda": 1500, "ni": -1133, "eps": -1.45, "fcf": -4000, "debt": 17000, "cash": 14000, "assets": 115000, "equity": 6500, "cur_a": 55000, "cur_l": 62000, "div": 0},
            {"year": 2021, "rev": 52149, "op_inc": 5342, "ebitda": 7100, "ni": 4213, "eps": 5.36, "fcf": 3511, "debt": 15000, "cash": 18000, "assets": 118000, "equity": 9500, "cur_a": 60000, "cur_l": 64000, "div": 1180},
            {"year": 2022, "rev": 58763, "op_inc": 5325, "ebitda": 7500, "ni": 4247, "eps": 5.40, "fcf": 4680, "debt": 14000, "cash": 21000, "assets": 125000, "equity": 13000, "cur_a": 68000, "cur_l": 70000, "div": 1420},
            {"year": 2023, "rev": 65446, "op_inc": 4603, "ebitda": 7200, "ni": 3789, "eps": 4.80, "fcf": 3885, "debt": 13500, "cash": 22000, "assets": 132000, "equity": 16500, "cur_a": 75000, "cur_l": 75000, "div": 1500},
            {"year": 2024, "rev": 69000, "op_inc": 5200, "ebitda": 7800, "ni": 4200, "eps": 5.30, "fcf": 4100, "debt": 13000, "cash": 23500, "assets": 138000, "equity": 19000, "cur_a": 80000, "cur_l": 78000, "div": 1700},
        ]
    }
}


DEFAULT_TICKER_MARKET_DATA = {
    "GLW": {"price": 205.79, "mcap": 175000000000.0, "pe": 34.2, "yield": 1.45},
    "MSFT": {"price": 535.07, "mcap": 3973000000000.0, "pe": 29.8, "yield": 0.75},
    "AAPL": {"price": 336.64, "mcap": 4913000000000.0, "pe": 38.6, "yield": 0.50},
    "GOOGL": {"price": 351.66, "mcap": 4301000000000.0, "pe": 17.64, "yield": 0.25},
    "NVDA": {"price": 229.28, "mcap": 5536000000000.0, "pe": 29.0, "yield": 0.10},
    "AMZN": {"price": 262.43, "mcap": 2830000000000.0, "pe": 21.1, "yield": 0.0},
    "META": {"price": 718.67, "mcap": 1830000000000.0, "pe": 27.1, "yield": 0.35},
    "TSLA": {"price": 382.70, "mcap": 1511000000000.0, "pe": 354.0, "yield": 0.0},
    "ASML": {"price": 1780.34, "mcap": 683800000000.0, "pe": 57.8, "yield": 0.95},
    "JNJ": {"price": 261.44, "mcap": 630000000000.0, "pe": 30.3, "yield": 2.50},
    "NVO": {"price": 38.64, "mcap": 170500000000.0, "pe": 9.4, "yield": 1.40},
    "UNH": {"price": 379.30, "mcap": 340400000000.0, "pe": 24.4, "yield": 1.80},
    "COST": {"price": 946.92, "mcap": 419600000000.0, "pe": 45.6, "yield": 0.60},
    "PG": {"price": 151.23, "mcap": 351500000000.0, "pe": 22.8, "yield": 2.60},
    "KO": {"price": 88.05, "mcap": 378800000000.0, "pe": 26.4, "yield": 3.10},
    "MCD": {"price": 235.23, "mcap": 166400000000.0, "pe": 19.1, "yield": 2.40},
    "OR.PA": {"price": 381.95, "mcap": 203300000000.0, "pe": 32.4, "yield": 1.70},
    "MC.PA": {"price": 382.00, "mcap": 188300000000.0, "pe": 17.4, "yield": 2.80},
    "RMS.PA": {"price": 1292.00, "mcap": 135300000000.0, "pe": 30.0, "yield": 0.90},
    "V": {"price": 385.45, "mcap": 723600000000.0, "pe": 32.8, "yield": 0.80},
    "MA": {"price": 589.14, "mcap": 516000000000.0, "pe": 32.4, "yield": 0.60},
    "AIR.PA": {"price": 187.96, "mcap": 148700000000.0, "pe": 25.0, "yield": 1.40},
    "SU.PA": {"price": 266.45, "mcap": 150000000000.0, "pe": 32.0, "yield": 1.90},
    "SAN.PA": {"price": 71.90, "mcap": 86100000000.0, "pe": 22.1, "yield": 4.10},
}


def safe_float(val: Any, default: Optional[float] = None) -> Optional[float]:
    if val is None:
        return default
    try:
        f = float(val)
        return default if math.isnan(f) or math.isinf(f) else f
    except (ValueError, TypeError):
        return default


class DataPipelineService:
    """
    Handles fetching financial data from yfinance (or curated historical database),
    calculating financial statement ratios, historical prices, and running the quality scorer.
    """

    @classmethod
    def seed_initial_universe(cls, db: Session, fetch_live_yfinance: bool = True) -> int:
        """
        Populate universe with comprehensive historical data and calculate quality scores.
        When fetch_live_yfinance is True, updates live prices and quotes from Yahoo Finance.
        Returns the number of companies seeded or refreshed.
        """
        logger.info(f"Seeding/refreshing initial company universe (live_quotes={fetch_live_yfinance})...")
        updated_count = 0
        
        for item in CURATED_UNIVERSE:
            symbol = item["symbol"]
            existing = db.query(Company).filter(Company.symbol == symbol).first()
            if not existing:
                company = Company(
                    symbol=symbol,
                    name=item["name"],
                    sector=item["sector"],
                    industry=item["industry"],
                    country=item["country"],
                    currency="EUR" if symbol.endswith(".PA") else "USD",
                    description=f"Leader mondial dans le secteur {item['sector']} ({item['industry']}).",
                    business_summary=item.get("business_summary"),
                    business_model=item.get("business_model")
                )
                db.add(company)
                db.commit()
                db.refresh(company)
            else:
                company = existing
                if item.get("business_summary"):
                    company.business_summary = item.get("business_summary")
                if item.get("business_model"):
                    company.business_model = item.get("business_model")
                db.commit()

            # Check if statements or prices already exist
            existing_stmts = db.query(FinancialStatement).filter(FinancialStatement.company_id == company.id).count()
            existing_prices = db.query(StockPrice).filter(StockPrice.company_id == company.id).count()
            
            if existing_stmts < 3 or existing_prices < 10:
                cls.populate_company_data(db, company, fetch_live_yfinance=fetch_live_yfinance)
                updated_count += 1
            elif fetch_live_yfinance:
                success = cls.refresh_company_live_data(db, company)
                if success:
                    updated_count += 1

        return updated_count

    @classmethod
    def populate_company_data(cls, db: Session, company: Company, fetch_live_yfinance: bool = False):
        symbol = company.symbol
        fallback_data = FALLBACK_FINANCIAL_PROFILES.get(symbol)
        
        # 1. First ensure 5-year financial statements and baseline data are populated
        if fallback_data:
            cls._populate_from_profile(db, company, fallback_data)
        else:
            cls._generate_generic_profile(db, company)

        # 2. If live fetching is desired, fetch real-time market data & 1Y daily history from yfinance
        live_success = False
        if fetch_live_yfinance:
            try:
                live_success = cls.refresh_company_live_data(db, company)
            except Exception as e:
                logger.warning(f"Live fetch for {symbol} failed ({e}), keeping curated profile baseline.")

        # 3. Recalculate Quality Score if live refresh didn't already
        if not live_success:
            statements = db.query(FinancialStatement).filter(FinancialStatement.company_id == company.id).all()
            q_score = QualityScoringEngine.evaluate_company(company, statements)
            
            existing_score = db.query(QualityScore).filter(QualityScore.company_id == company.id).first()
            if existing_score:
                db.delete(existing_score)
                db.commit()
            
            db.add(q_score)
            db.commit()

    @classmethod
    def refresh_company_live_data(cls, db: Session, company: Company) -> bool:
        """
        Fetches live market data (current price, market cap, PE ratio, dividend yield, 1Y price history)
        from yfinance, updates company fields and StockPrice table, and recalculates quality score.
        """
        try:
            ticker = yf.Ticker(company.symbol)
            info = ticker.info or {}
            
            price = safe_float(info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose"))
            
            # If info dict is empty or missing price, attempt retrieving latest close from history
            hist = ticker.history(period="1y")
            if not price and not hist.empty:
                price = safe_float(hist["Close"].iloc[-1])

            if not price:
                logger.warning(f"Could not retrieve live price for {company.symbol}")
                return False

            company.current_price = round(price, 2)
            
            mcap = safe_float(info.get("marketCap"))
            if mcap:
                company.market_cap = mcap
            
            pe = safe_float(info.get("trailingPE"))
            if pe:
                company.pe_ratio = round(pe, 2)
            
            div_yield = safe_float(info.get("dividendYield"))
            if div_yield is not None:
                company.dividend_yield = round(div_yield * 100.0, 2)
            
            if info.get("currency"):
                company.currency = str(info["currency"]).upper()
                
            if info.get("longBusinessSummary") and not company.business_summary:
                company.description = info["longBusinessSummary"]

            # Save full 1-year historical daily prices
            if not hist.empty:
                db.query(StockPrice).filter(StockPrice.company_id == company.id).delete()
                for idx, row in hist.iterrows():
                    dt = idx.to_pydatetime()
                    if hasattr(dt, "tzinfo") and dt.tzinfo is not None:
                        dt = dt.replace(tzinfo=None)
                    c_price = safe_float(row.get("Close"))
                    if c_price is None:
                        continue
                    price_row = StockPrice(
                        company_id=company.id,
                        date=dt,
                        open=round(safe_float(row.get("Open"), c_price), 2),
                        high=round(safe_float(row.get("High"), c_price), 2),
                        low=round(safe_float(row.get("Low"), c_price), 2),
                        close=round(c_price, 2),
                        volume=float(safe_float(row.get("Volume"), 0.0))
                    )
                    db.add(price_row)

            company.updated_at = datetime.utcnow()

            # Recalculate Quality Score with updated live market multiples
            statements = db.query(FinancialStatement).filter(FinancialStatement.company_id == company.id).all()
            if statements:
                q_score = QualityScoringEngine.evaluate_company(company, statements)
                existing_score = db.query(QualityScore).filter(QualityScore.company_id == company.id).first()
                if existing_score:
                    db.delete(existing_score)
                    db.commit()
                db.add(q_score)

            db.commit()
            db.refresh(company)
            logger.info(f"Successfully updated live market data for {company.symbol}: {company.current_price} {company.currency}, PE={company.pe_ratio}")
            return True
        except Exception as e:
            logger.error(f"Error fetching live data for {company.symbol}: {e}")
            db.rollback()
            return False

    @classmethod
    def _populate_from_profile(cls, db: Session, company: Company, profile: Dict[str, Any]):
        company.current_price = profile.get("price")
        company.market_cap = profile.get("mcap")
        company.pe_ratio = profile.get("pe")
        company.pfcf_ratio = profile.get("pfcf")
        company.dividend_yield = profile.get("yield")

        # Clean existing statements
        db.query(FinancialStatement).filter(FinancialStatement.company_id == company.id).delete()
        
        for y_data in profile.get("years", []):
            year = y_data["year"]
            rev = y_data["rev"]
            op_inc = y_data["op_inc"]
            ebitda = y_data["ebitda"]
            ni = y_data["ni"]
            fcf = y_data["fcf"]
            debt = y_data["debt"]
            cash = y_data["cash"]
            equity = y_data["equity"]
            cur_a = y_data["cur_a"]
            cur_l = y_data["cur_l"]
            net_debt = debt - cash
            invested_cap = max(100.0, equity + net_debt)

            # Ratios
            roe = round((ni / equity) * 100.0, 2) if equity and equity > 0 else 0.0
            roic = round((op_inc * 0.78 / invested_cap) * 100.0, 2) if invested_cap > 0 else 0.0
            op_margin = round((op_inc / rev) * 100.0, 2) if rev else 0.0
            net_margin = round((ni / rev) * 100.0, 2) if rev else 0.0
            cur_ratio = round(cur_a / cur_l, 2) if cur_l else 1.5
            net_debt_ebitda = round(net_debt / ebitda, 2) if ebitda and ebitda > 0 else 0.0
            int_cov = round(op_inc / max(1.0, debt * 0.035), 1) if debt else 25.0
            fcf_conv = round((fcf / ni) * 100.0, 1) if ni and ni > 0 else 0.0

            stmt = FinancialStatement(
                company_id=company.id,
                fiscal_year=year,
                report_date=datetime(year, 12, 31),
                revenue=rev,
                operating_income=op_inc,
                ebitda=ebitda,
                net_income=ni,
                eps=y_data["eps"],
                total_assets=y_data["assets"],
                total_equity=equity,
                cash_and_equivalents=cash,
                total_debt=debt,
                current_assets=cur_a,
                current_liabilities=cur_l,
                net_debt=net_debt,
                invested_capital=invested_cap,
                operating_cash_flow=fcf + (rev * 0.05),
                capital_expenditures=rev * 0.05,
                free_cash_flow=fcf,
                dividends_paid=y_data.get("div", 0.0),
                roe=roe,
                roic=roic,
                operating_margin=op_margin,
                net_margin=net_margin,
                current_ratio=cur_ratio,
                net_debt_to_ebitda=net_debt_ebitda,
                interest_coverage=int_cov,
                fcf_conversion_rate=fcf_conv
            )
            db.add(stmt)

        # Historical prices (past 180 days)
        db.query(StockPrice).filter(StockPrice.company_id == company.id).delete()
        base_price = company.current_price or 100.0
        now = datetime.utcnow()

        if company.symbol == "GLW":
            # Generate realistic upward momentum curve matching Databourse screenshots (47.10 to 209.83)
            start_price = 47.10
            target_price = company.current_price or 205.79
            for i in range(180, 0, -2):
                dt = now - timedelta(days=i)
                fraction = (180 - i) / 180.0
                # Momentum curve + realistic stock volatility
                curve = start_price + (target_price - start_price) * (fraction ** 1.35)
                noise = math.sin(i / 6.0) * 3.5 + math.cos(i / 11.0) * 2.0
                price_val = round(max(42.0, min(212.0, curve + noise)), 2)
                price_row = StockPrice(
                    company_id=company.id,
                    date=dt,
                    open=round(price_val * 0.995, 2),
                    high=round(price_val * 1.018, 2),
                    low=round(price_val * 0.985, 2),
                    close=price_val,
                    volume=3200000.0
                )
                db.add(price_row)
        else:
            for i in range(180, 0, -2):
                dt = now - timedelta(days=i)
                # small realistic pseudo random variation
                var = math.sin(i / 7.0) * 0.05 + math.cos(i / 13.0) * 0.03
                p = round(base_price * (1.0 + var), 2)
                price_row = StockPrice(
                    company_id=company.id,
                    date=dt,
                    open=round(p * 0.995, 2),
                    high=round(p * 1.01, 2),
                    low=round(p * 0.99, 2),
                    close=p,
                    volume=1500000.0
                )
                db.add(price_row)

        db.commit()

    @classmethod
    def _generate_generic_profile(cls, db: Session, company: Company):
        """Generates consistent mock financials for any other stock symbol"""
        meta = DEFAULT_TICKER_MARKET_DATA.get(company.symbol, {})
        company.current_price = meta.get("price", 150.0)
        company.market_cap = meta.get("mcap", 50000000000.0)
        company.pe_ratio = meta.get("pe", 20.0)
        company.pfcf_ratio = 18.0
        company.dividend_yield = meta.get("yield", 1.8)
        
        db.query(FinancialStatement).filter(FinancialStatement.company_id == company.id).delete()
        now_year = datetime.utcnow().year
        for y_idx in range(5):
            year = (now_year - 5) + y_idx
            growth = (1.07 ** y_idx)
            rev = 10000.0 * growth
            op_inc = rev * 0.22
            ebitda = rev * 0.28
            ni = rev * 0.17
            fcf = ni * 0.95
            debt = rev * 0.3
            cash = rev * 0.25
            equity = rev * 0.6
            cur_a = rev * 0.45
            cur_l = rev * 0.25
            net_debt = debt - cash

            stmt = FinancialStatement(
                company_id=company.id,
                fiscal_year=year,
                revenue=rev,
                operating_income=op_inc,
                ebitda=ebitda,
                net_income=ni,
                eps=round(ni / 500.0, 2),
                total_assets=rev * 1.2,
                total_equity=equity,
                cash_and_equivalents=cash,
                total_debt=debt,
                current_assets=cur_a,
                current_liabilities=cur_l,
                net_debt=net_debt,
                invested_capital=equity + net_debt,
                operating_cash_flow=fcf + 200,
                capital_expenditures=200,
                free_cash_flow=fcf,
                dividends_paid=ni * 0.35,
                roe=round((ni / equity) * 100.0, 2),
                roic=round((op_inc * 0.78 / (equity + net_debt)) * 100.0, 2),
                operating_margin=22.0,
                net_margin=17.0,
                current_ratio=round(cur_a / cur_l, 2),
                net_debt_to_ebitda=round(net_debt / ebitda, 2),
                interest_coverage=18.0,
                fcf_conversion_rate=95.0
            )
            db.add(stmt)

        # Generate historical prices for generic profiles as well
        db.query(StockPrice).filter(StockPrice.company_id == company.id).delete()
        base_price = company.current_price or 150.0
        now = datetime.utcnow()
        for i in range(180, 0, -2):
            dt = now - timedelta(days=i)
            var = math.sin(i / 7.0) * 0.05 + math.cos(i / 13.0) * 0.03
            p = round(base_price * (1.0 + var), 2)
            price_row = StockPrice(
                company_id=company.id,
                date=dt,
                open=round(p * 0.995, 2),
                high=round(p * 1.01, 2),
                low=round(p * 0.99, 2),
                close=p,
                volume=1500000.0
            )
            db.add(price_row)

        db.commit()
