-- Starter catalogue. Prices are intentionally inactive until the owner confirms supplier costs and retail prices.
INSERT OR IGNORE INTO products (id, game, title, denomination, price_pkr, is_active, sort_order) VALUES
('p60', 'PUBG Mobile', 'PUBG Mobile UC', '60 UC', 299, 0, 1),
('p325', 'PUBG Mobile', 'PUBG Mobile UC', '325 UC', 1399, 0, 2),
('p660', 'PUBG Mobile', 'PUBG Mobile UC', '660 UC', 2699, 0, 3),
('p1800', 'PUBG Mobile', 'PUBG Mobile UC', '1,800 UC', 6999, 0, 4),
('f100', 'Free Fire', 'Free Fire Diamonds', '100 Diamonds', 199, 0, 5),
('f310', 'Free Fire', 'Free Fire Diamonds', '310 Diamonds', 549, 0, 6),
('f520', 'Free Fire', 'Free Fire Diamonds', '520 Diamonds', 899, 0, 7),
('f1060', 'Free Fire', 'Free Fire Diamonds', '1,060 Diamonds', 1799, 0, 8);
