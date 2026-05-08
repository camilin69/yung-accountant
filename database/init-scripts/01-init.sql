-- Crear extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Tabla de posts
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    likes_count INTEGER DEFAULT 0,
    liked_by UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de comentarios
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

-- Tabla de transacciones de simulación
CREATE TABLE IF NOT EXISTS simulation_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    category_id UUID REFERENCES categories(id),
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days INTEGER NOT NULL,
    weeks INTEGER NOT NULL,
    months INTEGER NOT NULL,
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