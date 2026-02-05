-- Agregar columna holo_effect a las tablas de cartas
ALTER TABLE card_slots ADD COLUMN IF NOT EXISTS holo_effect TEXT DEFAULT NULL;
ALTER TABLE deck_cards ADD COLUMN IF NOT EXISTS holo_effect TEXT DEFAULT NULL;
