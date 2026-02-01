-- Instrucciones: Ejecuta este SQL en el Editor SQL de tu proyecto de Supabase.

-- 1. Crear la tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Advertencia: En producción se debe usar hashing
    store_name TEXT UNIQUE,
    role TEXT DEFAULT 'user', -- 'admin' o 'user'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Modificar la tabla de albums para asociarla a un usuario
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='albums' AND column_name='user_id') THEN
        ALTER TABLE albums ADD COLUMN user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Crear un usuario administrador por defecto (Opcional)
INSERT INTO usuarios (username, password, store_name, role)
VALUES ('admin', 'admin123', 'AdminStore', 'admin')
ON CONFLICT (username) DO NOTHING;

-- 4. Habilitar RLS (Opcional, pero recomendado para seguridad básica)
-- Por ahora, como el usuario dijo que no importa la seguridad, lo dejaremos abierto
-- o con políticas simples si es necesario.
