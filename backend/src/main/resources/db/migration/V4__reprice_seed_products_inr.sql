-- Prices are in INR. Reprice the V3 sample products, skipping any an admin has already changed.
UPDATE products SET price = v.inr
FROM (VALUES
    ('Wireless Headphones', 129.99, 10999.00),
    ('Mechanical Keyboard',  89.50,  7499.00),
    ('Ergonomic Mouse',      39.99,  2999.00),
    ('27" 4K Monitor',      349.00, 28999.00),
    ('USB-C Hub',            34.95,  2499.00),
    ('Laptop Stand',         45.00,  1999.00),
    ('Webcam 1080p',         59.99,  3999.00),
    ('Desk Lamp',            49.90,  2499.00)
) AS v(name, usd, inr)
WHERE products.name = v.name AND products.price = v.usd;
