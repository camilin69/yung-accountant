-- Crear extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- Para búsqueda de texto con trigramas
CREATE EXTENSION IF NOT EXISTS "vector";       -- Para búsquedas vectoriales/semánticas

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    age INTEGER CHECK (age >= 0 AND age <= 150),
    client_id VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    keycloak_id VARCHAR(255) UNIQUE,
    profile_pic TEXT,
    username VARCHAR(100) UNIQUE,
    display_name VARCHAR(200),
    bio TEXT,
    location VARCHAR(200),
    website VARCHAR(500),
    plan VARCHAR(20) DEFAULT 'free',
    followers TEXT[] DEFAULT '{}',
    following TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA ÚNICA DE CATEGORÍAS
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL para categorías del sistema
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    is_system BOOLEAN DEFAULT false,  -- true = categoría del sistema (inmutable)
    is_default BOOLEAN DEFAULT false, -- true = categoría por defecto para nuevos usuarios
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Las categorías del sistema tienen user_id NULL y nombre único
    -- Las categorías de usuario no pueden duplicar nombre para el mismo usuario
    CONSTRAINT unique_system_category UNIQUE (name, type, is_system),
    CONSTRAINT unique_user_category UNIQUE (user_id, name, type)
);

-- Tabla de wallets
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('cash', 'bank_account', 'credit_card', 'debit_card', 'other')),
    bank_name VARCHAR(100),
    last_four_digits VARCHAR(4),
    color VARCHAR(20),
    icon VARCHAR(50),
    current_balance DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de transacciones
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de metas (goals)
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    target_amount DECIMAL(15,2) NOT NULL,
    current_amount DECIMAL(15,2) DEFAULT 0,
    target_date DATE NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
    context TEXT,
    purchase_category_id UUID REFERENCES categories(id),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de deudas
CREATE TABLE IF NOT EXISTS debts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('borrowed', 'lent')),
    creditor_name VARCHAR(200) NOT NULL,
    wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id),
    original_amount DECIMAL(15,2) NOT NULL,
    remaining_balance DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) DEFAULT 0,
    interest_type VARCHAR(20) DEFAULT 'fixed' CHECK (interest_type IN ('fixed', 'variable')),
    compound_months INTEGER DEFAULT 0, -- 0 = sin compound, > 0 = capitaliza cada N meses
    term_months INTEGER NOT NULL,
    monthly_payment DECIMAL(15,2) NOT NULL,
    start_date DATE NOT NULL,
    next_due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paid', 'defaulted')),
    notes TEXT,
    real_amount_to_pay DECIMAL(15,2),
    real_interests DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Tabla de pagos de deudas
CREATE TABLE IF NOT EXISTS debt_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    amount DECIMAL(15,2) NOT NULL,
    date DATE NOT NULL,
    interest_amount DECIMAL(15,2) DEFAULT 0,
    principal_amount DECIMAL(15,2) NOT NULL,
    remaining_balance DECIMAL(15,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de intereses variables
CREATE TABLE IF NOT EXISTS variable_interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    rate DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(debt_id, month)
);

-- Tabla de transacciones de metas
CREATE TABLE IF NOT EXISTS goal_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    amount DECIMAL(15,2) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('add', 'remove')),
    note TEXT,
    date DATE NOT NULL,
    wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de hábitos (con checks como JSONB)
CREATE TABLE IF NOT EXISTS habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    checks JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA DE POSTS (optimizada con pgvector + pg_trgm)
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    tags TEXT[] DEFAULT '{}',
    likes_count INTEGER DEFAULT 0,
    liked_by UUID[] DEFAULT '{}',
    
    -- ✅ Campos para búsqueda optimizada
    embedding vector(384),  -- Para embeddings ONNX (384 dimensiones)
    search_vector tsvector,   -- Para búsqueda full-text de PostgreSQL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA DE COMENTARIOS
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    liked_by UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- FEED PARA RECOMENDAR POSTS
-- ============================================
CREATE TABLE IF NOT EXISTS user_post_interactions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    liked BOOLEAN DEFAULT false,
    commented BOOLEAN DEFAULT false,
    viewed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    interaction_score REAL DEFAULT 0,
    PRIMARY KEY (user_id, post_id)
);

-- Tabla de transacciones de simulación
CREATE TABLE IF NOT EXISTS simulation_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    category_id UUID REFERENCES categories(id),
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days DECIMAL(10,2) NOT NULL,
    weeks DECIMAL(10,2) NOT NULL,
    months DECIMAL(10,2) NOT NULL,
    period VARCHAR(10) NOT NULL CHECK (period IN ('day', 'week', 'month')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INSERTAR CATEGORÍAS DEL SISTEMA (INMUTABLES)
-- ============================================
INSERT INTO categories (id, user_id, name, type, icon, color, is_system, is_default) VALUES
    -- Income categories
    (uuid_generate_v4(), NULL, 'Salary', 'income', 'Briefcase', '#10B981', false, true),
    (uuid_generate_v4(), NULL, 'Freelance', 'income', 'Laptop', '#10B981', false, true),
    (uuid_generate_v4(), NULL, 'Gift', 'income', 'Gift', '#10B981', false, true),
    (uuid_generate_v4(), NULL, 'Investment', 'income', 'TrendingUp', '#10B981', false, true),
    
    -- Transfer categories
    (uuid_generate_v4(), NULL, 'Wallet Transfer', 'income', 'ArrowLeftRight', '#6366F1', false, true),
    (uuid_generate_v4(), NULL, 'Wallet Transfer', 'expense', 'ArrowLeftRight', '#6366F1', false, true),
    
    -- Expense categories
    (uuid_generate_v4(), NULL, 'Food', 'expense', 'Utensils', '#EF4444', false, true),
    (uuid_generate_v4(), NULL, 'Transport', 'expense', 'Car', '#F59E0B', false, true),
    (uuid_generate_v4(), NULL, 'Entertainment', 'expense', 'Gamepad2', '#A855F7', false, true),
    (uuid_generate_v4(), NULL, 'Savings', 'expense', 'PiggyBank', '#10B981', false, true),
    (uuid_generate_v4(), NULL, 'Health', 'expense', 'Heart', '#EC4899', false, true),
    (uuid_generate_v4(), NULL, 'Education', 'expense', 'GraduationCap', '#6366F1', false, true),
    (uuid_generate_v4(), NULL, 'Rent', 'expense', 'Home', '#FF6584', false, true),
    (uuid_generate_v4(), NULL, 'Utilities', 'expense', 'Zap', '#F59E0B', false, true),
    (uuid_generate_v4(), NULL, 'Shopping', 'expense', 'ShoppingBag', '#EC4899', false, true),
    (uuid_generate_v4(), NULL, 'Travel', 'expense', 'Plane', '#06B6D4', false, true),
    
    -- Debt system categories
    (uuid_generate_v4(), NULL, 'Borrow', 'income', 'Wallet', '#10B981', true, true),
    (uuid_generate_v4(), NULL, 'Lent', 'expense', 'HandCoins', '#EF4444', true, true),
    (uuid_generate_v4(), NULL, 'Debt Payment', 'expense', 'CreditCard', '#EF4444', true, true),
    (uuid_generate_v4(), NULL, 'Debt Collection', 'income', 'Wallet', '#10B981', true, true);

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON debts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON habits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_keycloak_id ON users(keycloak_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_is_system ON categories(is_system);
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_debts_user_id ON debts(user_id);
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);

-- Índices pg_trgm para usuarios (búsqueda rápida de texto)
CREATE INDEX idx_users_username_trgm ON users USING gin (username gin_trgm_ops);
CREATE INDEX idx_users_display_name_trgm ON users USING gin (display_name gin_trgm_ops);
CREATE INDEX idx_users_first_name_trgm ON users USING gin (first_name gin_trgm_ops);
CREATE INDEX idx_users_last_name_trgm ON users USING gin (last_name gin_trgm_ops);
CREATE INDEX idx_users_bio_trgm ON users USING gin (bio gin_trgm_ops);

-- Índices pg_trgm para posts
CREATE INDEX idx_posts_title_trgm ON posts USING gin (title gin_trgm_ops);
CREATE INDEX idx_posts_content_trgm ON posts USING gin (content gin_trgm_ops);
CREATE INDEX idx_posts_tags_trgm ON posts USING gin (tags);

-- Índice full-text search para posts
CREATE INDEX idx_posts_search_vector ON posts USING gin (search_vector);

-- Índice pgvector para búsqueda semántica
CREATE INDEX idx_posts_embedding ON posts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Índice para comentarios
CREATE INDEX idx_comments_content_trgm ON comments USING gin (content gin_trgm_ops);

-- Índice para feed

CREATE INDEX idx_interactions_user ON user_post_interactions(user_id);

-- ============================================
-- TRIGGER PARA ACTUALIZAR SEARCH_VECTOR AUTOMÁTICAMENTE
-- ============================================
CREATE OR REPLACE FUNCTION update_posts_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_posts_search_vector
    BEFORE INSERT OR UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_posts_search_vector();

-- Actualizar registros existentes (si hay)
UPDATE posts SET search_vector = 
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'C');

-- ============================================
-- FUNCIONES DE BÚSQUEDA OPTIMIZADAS
-- ============================================

-- Búsqueda de usuarios con pg_trgm
CREATE OR REPLACE FUNCTION search_users_trgm(search_query TEXT, page_num INT DEFAULT 1, page_limit INT DEFAULT 10)
RETURNS TABLE(
    id UUID,
    username VARCHAR,
    display_name VARCHAR,
    avatar TEXT,
    bio TEXT,
    followers_count INT,
    posts_count INT,
    similarity REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.display_name,
        u.profile_pic as avatar,
        COALESCE(u.bio, '') as bio,
        COALESCE(array_length(u.followers, 1), 0) as followers_count,  -- ← Cambiado
        (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id)::INT as posts_count,
        GREATEST(
            similarity(u.username, search_query),
            similarity(u.display_name, search_query),
            similarity(u.first_name, search_query),
            similarity(u.last_name, search_query)
        ) as sim
    FROM users u
    WHERE 
        u.username % search_query 
        OR u.display_name % search_query 
        OR u.first_name % search_query 
        OR u.last_name % search_query
        OR COALESCE(u.bio, '') % search_query
    ORDER BY sim DESC, followers_count DESC
    LIMIT page_limit
    OFFSET (page_num - 1) * page_limit;
END;
$$ LANGUAGE plpgsql;

-- Búsqueda de posts con full-text search + pg_trgm
CREATE OR REPLACE FUNCTION search_posts_optimized(
    search_query TEXT,
    user_id_param UUID DEFAULT NULL,
    page_num INT DEFAULT 1,
    page_limit INT DEFAULT 10
)
RETURNS TABLE(
    id UUID, user_id UUID, title VARCHAR, content TEXT, tags TEXT[],
    likes_count INT, liked_by UUID[], username VARCHAR, display_name VARCHAR,
    avatar TEXT, comments_count BIGINT, rank REAL,
    created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, 
    image_url TEXT
) AS $$
DECLARE
    user_client_id VARCHAR;
    user_role VARCHAR;
    ts_query tsquery;
    query_valid BOOLEAN := false;
BEGIN
    IF user_id_param IS NOT NULL THEN
        SELECT u.client_id, u.role INTO user_client_id, user_role
        FROM users u WHERE u.id = user_id_param;
    END IF;
    
    BEGIN
        ts_query := plainto_tsquery('english', search_query);
        IF ts_query IS NOT NULL THEN query_valid := true; END IF;
    EXCEPTION WHEN OTHERS THEN query_valid := false; END;
    
    RETURN QUERY
    SELECT 
        p.id, p.user_id, p.title, LEFT(p.content, 200)::TEXT, p.tags,
        p.likes_count, p.liked_by, u.username, u.display_name,
        u.profile_pic as avatar,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments_count,
        (
            CASE WHEN query_valid AND p.search_vector @@ ts_query THEN ts_rank(p.search_vector, ts_query)::real
                 WHEN p.title ILIKE '%' || search_query || '%' THEN 0.5::real
                 ELSE 0.1::real
            END +
            CASE WHEN user_client_id IS NOT NULL AND u.client_id = user_client_id THEN 0.3 ELSE 0 END +
            CASE WHEN user_role IS NOT NULL AND u.role = user_role THEN 0.2 ELSE 0 END
        )::real as rank,
        p.created_at, 
        p.updated_at,
        p.image_url      
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE 
        (query_valid AND p.search_vector @@ ts_query)
        OR similarity(p.title, search_query) > 0.2
        OR similarity(p.content, search_query) > 0.2
        OR p.title ILIKE '%' || search_query || '%'
        OR p.content ILIKE '%' || search_query || '%'
        OR EXISTS (SELECT 1 FROM unnest(p.tags) tag WHERE similarity(tag, search_query) > 0.2)
        OR EXISTS (SELECT 1 FROM unnest(p.tags) tag WHERE tag ILIKE '%' || search_query || '%')
    ORDER BY rank DESC, p.likes_count DESC, p.created_at DESC
    LIMIT page_limit
    OFFSET (page_num - 1) * page_limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_personalized_feed(
    p_user_id UUID,
    page_limit INT DEFAULT 10
)
RETURNS TABLE(
    id UUID, user_id UUID, title VARCHAR, content TEXT, tags TEXT[],
    likes_count INT, liked_by UUID[], username VARCHAR, display_name VARCHAR,
    avatar TEXT, comments_count BIGINT, created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ, image_url TEXT, score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, p.user_id, p.title, p.content, p.tags,
        p.likes_count, p.liked_by, u.username, u.display_name,
        u.profile_pic as avatar,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments_count,
        p.created_at, p.updated_at, p.image_url,
        (
            -- Score base por tiempo
            (EXTRACT(EPOCH FROM (p.created_at - NOW() + INTERVAL '30 days')) / 86400.0 * 0.3) +
            -- Likes
            (p.likes_count * 1.5) +
            -- Comentarios
            ((SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) * 2.0) +
            -- Tags que le gustan al usuario
            COALESCE(
                (SELECT COUNT(*) FROM unnest(p.tags) tag 
                 WHERE tag IN (
                     SELECT DISTINCT unnest(p2.tags) 
                     FROM user_post_interactions upi 
                     JOIN posts p2 ON upi.post_id = p2.id 
                     WHERE upi.user_id = p_user_id AND upi.liked = true
                 )
                ) * 3.0, 
            0) +
            -- Usuarios que sigue
            CASE WHEN p.user_id::text = ANY(
                COALESCE((SELECT u2.following FROM users u2 WHERE u2.id = p_user_id), '{}')
            ) THEN 10.0 ELSE 0 END +
            -- Penalizar posts ya vistos
            CASE WHEN EXISTS(
                SELECT 1 FROM user_post_interactions upi2 
                WHERE upi2.user_id = p_user_id AND upi2.post_id = p.id
            ) THEN -5.0 ELSE 0 END +
            -- Penalizar posts propios
            CASE WHEN p.user_id = p_user_id THEN -100.0 ELSE 0 END
        )::REAL as score
    FROM posts p 
    JOIN users u ON p.user_id = u.id
    WHERE p.created_at > NOW() - INTERVAL '30 days'
    ORDER BY score DESC
    LIMIT page_limit;
END;
$$ LANGUAGE plpgsql;




-- Búsqueda semántica con pgvector (requiere embeddings)
CREATE OR REPLACE FUNCTION search_posts_semantic(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10
)
RETURNS TABLE(
    id UUID,
    title VARCHAR,
    content TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.content,
        1 - (p.embedding <=> query_embedding) as similarity
    FROM posts p
    WHERE 1 - (p.embedding <=> query_embedding) > match_threshold
    ORDER BY p.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función para normalizar texto de búsqueda
CREATE OR REPLACE FUNCTION normalize_search_query(query TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN lower(trim(regexp_replace(query, '\s+', ' ', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para obtener posts recomendados
CREATE OR REPLACE FUNCTION get_recommended_posts_optimized(
    p_user_id UUID,
    page_limit INT DEFAULT 10
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    title VARCHAR,
    content TEXT,
    tags TEXT[],
    likes_count INT,
    liked_by UUID[],           
    username VARCHAR,
    display_name VARCHAR,
    avatar TEXT,
    comments_count BIGINT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    image_url TEXT            
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.title,
        p.content,
        p.tags,
        p.likes_count,
        p.liked_by,             
        u.username,
        u.display_name,
        u.profile_pic as avatar,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments_count,
        p.created_at,
        p.updated_at,
        p.image_url             
    FROM posts p 
    JOIN users u ON p.user_id = u.id
    WHERE 
        p.user_id::text = ANY(
            COALESCE(
                (SELECT following FROM users WHERE users.id = p_user_id),
                '{}'
            )
        )
        OR p.likes_count > 0
    ORDER BY p.likes_count DESC, p.created_at DESC
    LIMIT page_limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_trending_posts(
    page_limit INT DEFAULT 10
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    title VARCHAR,
    content TEXT,
    tags TEXT[],
    likes_count INT,
    liked_by UUID[],
    username VARCHAR,
    display_name VARCHAR,
    avatar TEXT,
    comments_count BIGINT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    image_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.title,
        p.content,
        p.tags,
        p.likes_count,
        p.liked_by,
        u.username,
        u.display_name,
        u.profile_pic as avatar,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments_count,
        p.created_at,
        p.updated_at,
        p.image_url
    FROM posts p 
    JOIN users u ON p.user_id = u.id
    ORDER BY 
        -- Score: 60% likes + 40% comentarios
        (p.likes_count * 0.6 + (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) * 0.4) DESC,
        p.created_at DESC
    LIMIT page_limit;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- CONFIGURACIÓN DE POSTGRESQL PARA RENDIMIENTO
-- ============================================

-- Ajustar estos parámetros en postgresql.conf o como parámetros de inicio:
/*
shared_buffers = 1GB
effective_cache_size = 3GB
maintenance_work_mem = 256MB
work_mem = 16MB
random_page_cost = 1.1
effective_io_concurrency = 200
*/

-- O establecerlos temporalmente para la sesión actual:
SET work_mem = '16MB';
SET maintenance_work_mem = '256MB';