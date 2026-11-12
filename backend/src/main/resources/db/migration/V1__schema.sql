CREATE TABLE company (
    id UUID PRIMARY KEY,
    legal_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    founded_on DATE,
    industry VARCHAR(255),
    service_area VARCHAR(255),
    status_label VARCHAR(100),
    mission TEXT,
    highlight_title VARCHAR(255),
    highlight_body TEXT,
    projects_completed_label VARCHAR(50),
    partners_label VARCHAR(50),
    tax_code VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE site_settings (
    id UUID PRIMARY KEY,
    brand_name VARCHAR(255) NOT NULL,
    tagline VARCHAR(500),
    hero_title VARCHAR(500) NOT NULL,
    hero_subtitle TEXT,
    hero_cta_label VARCHAR(100),
    hero_badge_primary VARCHAR(100),
    hero_badge_secondary VARCHAR(100),
    seo_title VARCHAR(255),
    seo_description TEXT,
    nav_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE categories (
    id UUID PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE products (
    id UUID PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES categories (id),
    slug VARCHAR(150) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    short_description VARCHAR(500),
    description TEXT,
    brand VARCHAR(150),
    specs_summary VARCHAR(255),
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    image_url VARCHAR(500),
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_products_category_id ON products (category_id);
CREATE INDEX idx_products_featured ON products (featured);

CREATE TABLE site_advantages (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon_key VARCHAR(50),
    sort_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE contact_info (
    id UUID PRIMARY KEY,
    address_old TEXT,
    address_new TEXT,
    address_note TEXT,
    hotline_display VARCHAR(50) NOT NULL,
    hotline_e164 VARCHAR(30) NOT NULL,
    hotline_contact_name VARCHAR(100),
    email VARCHAR(255),
    zalo_url VARCHAR(500),
    facebook_url VARCHAR(500),
    business_hours_weekday VARCHAR(255),
    business_hours_weekend VARCHAR(255),
    map_embed_url VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE quote_requests (
    id UUID PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(255),
    company_name VARCHAR(255),
    product_interest VARCHAR(255),
    message TEXT NOT NULL,
    source_page VARCHAR(255),
    client_ip VARCHAR(64),
    user_agent VARCHAR(500),
    status VARCHAR(30) NOT NULL DEFAULT 'NEW',
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_quote_requests_created_at ON quote_requests (created_at DESC);
CREATE INDEX idx_quote_requests_client_ip ON quote_requests (client_ip);
