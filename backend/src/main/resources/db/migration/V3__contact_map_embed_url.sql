-- M1: populate contact map embed from the verified original-site Google Maps iframe
-- (https://thanhanbacgiang.com.vn/ HTML fetched 2026-11-14 UTC). Do not rewrite V2.
UPDATE contact_info
SET
    map_embed_url = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4800.592803124682!2d105.9060136!3d21.327291!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31351b00de267aab%3A0xf9bdf6e4539848fd!2sC%C3%B4ng%20Ty%20TNHH%20Thanh%20An%20B%E1%BA%AFc%20Giang!5e1!3m2!1svi!2s!4v1775215410461!5m2!1svi!2s',
    updated_at = TIMESTAMPTZ '2026-11-14 00:00:00+00'
WHERE id = '66666666-6666-6666-6666-666666666666'
  AND (map_embed_url IS NULL OR btrim(map_embed_url) = '');
