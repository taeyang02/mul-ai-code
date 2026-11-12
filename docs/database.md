# Database schema — Thanh An Bắc Giang

PostgreSQL 16. Migrations managed by Flyway (`backend/src/main/resources/db/migration`).

## ER overview

```text
company (1) ──────────── site_settings (1)
categories (1) ──< products (N)
site_advantages (N)
contact_info (1)
quote_requests (N)
```

## Tables

### company

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| legal_name | VARCHAR(255) NOT NULL | |
| trade_name | VARCHAR(255) | |
| founded_on | DATE | |
| industry | VARCHAR(255) | |
| service_area | VARCHAR(255) | |
| status_label | VARCHAR(100) | e.g. "Đang hoạt động mạnh mẽ" |
| mission | TEXT | |
| highlight_title | VARCHAR(255) | |
| highlight_body | TEXT | |
| projects_completed_label | VARCHAR(50) | Verified marketing label from site, not invented metric |
| partners_label | VARCHAR(50) | Same rule |
| tax_code | VARCHAR(50) | Optional; NULL until primary source confirmed — do not invent |
| created_at / updated_at | TIMESTAMPTZ | |

### site_settings

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Single-row config |
| brand_name | VARCHAR(255) NOT NULL | |
| tagline | VARCHAR(500) | |
| hero_title | VARCHAR(500) | |
| hero_subtitle | TEXT | |
| hero_cta_label | VARCHAR(100) | |
| hero_badge_primary | VARCHAR(100) | e.g. "Hoạt động từ 2015" |
| hero_badge_secondary | VARCHAR(100) | e.g. "Giao nhanh 24/7" |
| seo_title | VARCHAR(255) | |
| seo_description | TEXT | |
| nav_items | JSONB | `[{ "label", "href" }]` |
| created_at / updated_at | TIMESTAMPTZ | |

### categories

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| slug | VARCHAR(100) UNIQUE | |
| name | VARCHAR(255) NOT NULL | |
| description | TEXT | |
| sort_order | INT NOT NULL DEFAULT 0 | |
| active | BOOLEAN NOT NULL DEFAULT TRUE | |

### products

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| category_id | UUID FK → categories | |
| slug | VARCHAR(150) UNIQUE | |
| name | VARCHAR(255) NOT NULL | |
| short_description | VARCHAR(500) | |
| description | TEXT | |
| brand | VARCHAR(150) | |
| specs_summary | VARCHAR(255) | e.g. "PCB30 - PCB40" |
| features | JSONB | string array |
| image_url | VARCHAR(500) | nullable |
| featured | BOOLEAN NOT NULL DEFAULT FALSE | |
| sort_order | INT NOT NULL DEFAULT 0 | |
| active | BOOLEAN NOT NULL DEFAULT TRUE | |
| created_at / updated_at | TIMESTAMPTZ | |

### site_advantages

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| title | VARCHAR(255) NOT NULL | |
| description | TEXT NOT NULL | |
| icon_key | VARCHAR(50) | Frontend maps to icon |
| sort_order | INT NOT NULL DEFAULT 0 | |
| active | BOOLEAN NOT NULL DEFAULT TRUE | |

### contact_info

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Single-row |
| address_old | TEXT | |
| address_new | TEXT | |
| address_note | TEXT | e.g. registration note |
| hotline_display | VARCHAR(50) | |
| hotline_e164 | VARCHAR(30) | digits for dial/Zalo |
| hotline_contact_name | VARCHAR(100) | |
| email | VARCHAR(255) | |
| zalo_url | VARCHAR(500) | nullable |
| facebook_url | VARCHAR(500) | nullable |
| business_hours_weekday | VARCHAR(255) | |
| business_hours_weekend | VARCHAR(255) | |
| map_embed_url | VARCHAR(1000) | nullable |
| created_at / updated_at | TIMESTAMPTZ | |

### quote_requests

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| full_name | VARCHAR(150) NOT NULL | |
| phone | VARCHAR(30) NOT NULL | |
| email | VARCHAR(255) | |
| company_name | VARCHAR(255) | |
| product_interest | VARCHAR(255) | |
| message | TEXT NOT NULL | |
| source_page | VARCHAR(255) | |
| client_ip | VARCHAR(64) | |
| user_agent | VARCHAR(500) | |
| status | VARCHAR(30) NOT NULL DEFAULT 'NEW' | NEW / CONTACTED / CLOSED |
| created_at | TIMESTAMPTZ NOT NULL | |

## Seed policy

Seed data in `V2__seed_verified_content.sql` only includes content verified from https://thanhanbacgiang.com.vn/ (and optionally public business registry fields). Do not invent certifications, prices, or unverified metrics.
