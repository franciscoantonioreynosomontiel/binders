-- Añadir columna de visibilidad pública a las tablas de álbumes y decks
ALTER TABLE albums ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Refrescar el caché del esquema en Supabase después de ejecutar esto
-- para que la API detecte las nuevas columnas.
