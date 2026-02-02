-- SQL PARA ACTUALIZAR LA TABLA DE CARTAS EN DECKS
-- Ejecuta esto en el SQL Editor de Supabase

ALTER TABLE deck_cards
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS rarity TEXT,
ADD COLUMN IF NOT EXISTS expansion TEXT,
ADD COLUMN IF NOT EXISTS condition TEXT,
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS price TEXT;

-- Comentario: Estos campos permiten que las cartas de los decks tengan la misma
-- información detallada que las cartas de los álbumes.
