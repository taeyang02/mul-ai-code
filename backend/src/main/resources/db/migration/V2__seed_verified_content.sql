-- Seed content verified from https://thanhanbacgiang.com.vn/ (fetched 2026-11-12).
-- tax_code left NULL until a primary source URL is confirmed (do not invent MST).

INSERT INTO company (
    id, legal_name, trade_name, founded_on, industry, service_area, status_label,
    mission, highlight_title, highlight_body, projects_completed_label, partners_label,
    tax_code, created_at, updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'CÔNG TY TNHH THANH AN BẮC GIANG',
    'Thanh An Bắc Giang',
    DATE '2015-02-06',
    'Bán buôn VLXD (Thép, Xi măng)',
    'Hiệp Hoà & toàn Bắc Giang',
    'Đang hoạt động mạnh mẽ',
    'Cung cấp vật liệu xây dựng chính hãng, đúng tiến độ, đồng hành cùng mọi công trình từ nhà ở đến khu công nghiệp.',
    'Thép & Xi măng số 1 Bắc Giang',
    'Đối tác chiến lược của Tập đoàn Hòa Phát và Xi măng Pomihua, đảm bảo nguồn hàng ổn định, giá tốt nhất thị trường.',
    '1500+',
    '50+',
    NULL,
    TIMESTAMPTZ '2026-11-12 00:00:00+00',
    TIMESTAMPTZ '2026-11-12 00:00:00+00'
);

INSERT INTO site_settings (
    id, brand_name, tagline, hero_title, hero_subtitle, hero_cta_label,
    hero_badge_primary, hero_badge_secondary, seo_title, seo_description, nav_items,
    created_at, updated_at
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Thanh An Bắc Giang',
    'Vật liệu xây dựng uy tín',
    'Vật liệu xây dựng Chất lượng vượt trội',
    'Chuyên phân phối Thép Hòa Phát, Xi măng Pomihua hàng đầu Bắc Giang. Uy tín - Giá cạnh tranh - Giao hàng tận công trình.',
    'Yêu cầu báo giá',
    'Hoạt động từ 2015',
    'Giao nhanh 24/7',
    'Thanh An Bắc Giang | Vật liệu xây dựng uy tín',
    'Công ty TNHH Thanh An Bắc Giang — phân phối Thép Hòa Phát, Xi măng Pomihua tại Bắc Giang.',
    '[{"label":"Trang chủ","href":"/"},{"label":"Giới thiệu","href":"/#about"},{"label":"Sản phẩm","href":"/#products"},{"label":"Lợi thế","href":"/#advantages"},{"label":"Liên hệ","href":"/#contact"}]'::jsonb,
    TIMESTAMPTZ '2026-11-12 00:00:00+00',
    TIMESTAMPTZ '2026-11-12 00:00:00+00'
);

INSERT INTO categories (id, slug, name, description, sort_order, active) VALUES
    ('33333333-3333-3333-3333-333333333301', 'thep', 'Thép xây dựng', 'Thép xây dựng chính hãng phục vụ công trình dân dụng và công nghiệp.', 1, TRUE),
    ('33333333-3333-3333-3333-333333333302', 'xi-mang', 'Xi măng', 'Xi măng Pooc lăng hỗn hợp chất lượng cao.', 2, TRUE);

INSERT INTO products (
    id, category_id, slug, name, short_description, description, brand, specs_summary,
    features, image_url, featured, sort_order, active, created_at, updated_at
) VALUES
(
    '44444444-4444-4444-4444-444444444401',
    '33333333-3333-3333-3333-333333333301',
    'thep-hoa-phat',
    'Thép Hòa Phát',
    'Thép xây dựng chất lượng cao',
    'Thép thanh vằn, thép cuộn D6-D32, thép hình, thép hộp đạt tiêu chuẩn JIS, ASTM. Độ bền vượt trội, chịu lực tốt cho mọi công trình dân dụng và công nghiệp.',
    'Hòa Phát',
    'D6-D32 / JIS, ASTM',
    '["Đa dạng quy cách, đủ chủng loại","Có chứng nhận hợp chuẩn"]'::jsonb,
    NULL,
    TRUE,
    1,
    TRUE,
    TIMESTAMPTZ '2026-11-12 00:00:00+00',
    TIMESTAMPTZ '2026-11-12 00:00:00+00'
),
(
    '44444444-4444-4444-4444-444444444402',
    '33333333-3333-3333-3333-333333333302',
    'xi-mang-pomihua',
    'Xi măng Pomihua',
    'Độ kết dính hoàn hảo',
    'Xi măng Pooc lăng hỗn hợp chất lượng cao, mác 30, 40 phù hợp cho đổ bê tông, trát, xây tô, đảm bảo độ kết dính và kháng thấm tốt.',
    'Pomihua',
    'PCB30 - PCB40',
    '["Đóng bao 50kg, xuất xứ rõ ràng","Giao hàng tới chân công trình"]'::jsonb,
    NULL,
    TRUE,
    2,
    TRUE,
    TIMESTAMPTZ '2026-11-12 00:00:00+00',
    TIMESTAMPTZ '2026-11-12 00:00:00+00'
);

INSERT INTO site_advantages (id, title, description, icon_key, sort_order, active) VALUES
    ('55555555-5555-5555-5555-555555555501', 'Uy tín hàng đầu', 'Cam kết nguồn hàng chính hãng, minh bạch giá, hợp đồng rõ ràng.', 'trust', 1, TRUE),
    ('55555555-5555-5555-5555-555555555502', 'Giá cạnh tranh', 'Chiết khấu cao cho nhà thầu, đại lý, hỗ trợ giá theo lô lớn.', 'price', 2, TRUE),
    ('55555555-5555-5555-5555-555555555503', 'Giao hàng nhanh', 'Đội xe vận tải chuyên nghiệp, giao đúng hẹn trong 24-48h.', 'delivery', 3, TRUE),
    ('55555555-5555-5555-5555-555555555504', 'Nguồn hàng ổn định', 'Kho bãi rộng, liên kết trực tiếp nhà máy, không gián đoạn cung ứng.', 'supply', 4, TRUE);

INSERT INTO contact_info (
    id, address_old, address_new, address_note, hotline_display, hotline_e164,
    hotline_contact_name, email, zalo_url, facebook_url, business_hours_weekday,
    business_hours_weekend, map_embed_url, created_at, updated_at
) VALUES (
    '66666666-6666-6666-6666-666666666666',
    'Thôn Gò Pháo, Xã Hợp Thịnh, Huyện Hiệp Hoà, Bắc Giang',
    'Thôn Gò Pháo, Xã Hợp Thịnh, Huyện Hiệp Hoà, Bắc Ninh',
    'Theo đăng ký kinh doanh',
    '0393.284.994',
    '0393284994',
    'Nguyễn Hải Yến',
    'thanhan.bg@vatlieuxd.com',
    NULL,
    NULL,
    'Thứ 2 - Thứ 7: 7:30 - 17:30',
    'Chủ nhật & lễ: Tư vấn qua hotline',
    NULL,
    TIMESTAMPTZ '2026-11-12 00:00:00+00',
    TIMESTAMPTZ '2026-11-12 00:00:00+00'
);
