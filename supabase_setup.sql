-- CONFIGURACIÓN DE BASE DE DATOS PARA TCG DUAL
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Crear tabla de usuarios (si no existe)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    store_name TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Asegurar que la columna 'role' existe (por si la tabla ya existía)
-- Si recibes el error "Could not find the 'role' column", ejecuta esta línea:
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 3. Crear tabla de álbumes
CREATE TABLE IF NOT EXISTS albums (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    cover_image_url TEXT,
    back_image_url TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Crear tabla de páginas
CREATE TABLE IF NOT EXISTS pages (
    id SERIAL PRIMARY KEY,
    album_id INTEGER REFERENCES albums(id) ON DELETE CASCADE,
    page_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Crear tabla de espacios para cartas (slots)
CREATE TABLE IF NOT EXISTS card_slots (
    id SERIAL PRIMARY KEY,
    page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
    slot_index INTEGER NOT NULL,
    image_url TEXT,
    name TEXT,
    rarity TEXT,
    expansion TEXT,
    condition TEXT,
    quantity INTEGER DEFAULT 1,
    price TEXT,
    holo_effect TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(page_id, slot_index)
);

-- 6. Desactivar RLS para simplificar (Opcional, pero recomendado para este proyecto según petición del usuario)
-- 6. Crear tabla de Decks
CREATE TABLE IF NOT EXISTS decks (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Crear tabla de Cartas en Decks
CREATE TABLE IF NOT EXISTS deck_cards (
    id SERIAL PRIMARY KEY,
    deck_id INTEGER REFERENCES decks(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    name TEXT,
    rarity TEXT,
    expansion TEXT,
    condition TEXT,
    quantity INTEGER DEFAULT 1,
    price TEXT,
    holo_effect TEXT,
    card_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Desactivar RLS para simplificar (Opcional, pero recomendado para este proyecto según petición del usuario)
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE albums DISABLE ROW LEVEL SECURITY;
ALTER TABLE pages DISABLE ROW LEVEL SECURITY;
ALTER TABLE card_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE decks DISABLE ROW LEVEL SECURITY;
ALTER TABLE deck_cards DISABLE ROW LEVEL SECURITY;

-- 9. Crear usuario Administrador por defecto (Opcional)
-- Cambia 'admin123' por una contraseña segura
INSERT INTO usuarios (username, password, store_name, role)
VALUES ('admin', 'admin123', 'AdminStore', 'admin')
ON CONFLICT (username) DO NOTHING;

-- NOTA: Si después de ejecutar esto sigues teniendo problemas con la columna 'role',
-- intenta recargar la página de Supabase o usar el botón "Refresh" en el editor de tablas.
