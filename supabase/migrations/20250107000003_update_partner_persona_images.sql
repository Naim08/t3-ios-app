-- Update Partner Persona Icons from Emojis to WebP Images
-- This migration updates existing partner persona templates to use custom artwork

UPDATE personas 
SET icon = 'gf_1.webp' 
WHERE id = 'girlfriend-caring';

UPDATE personas 
SET icon = 'gf_2.webp' 
WHERE id = 'girlfriend-playful';

UPDATE personas 
SET icon = 'bf_1.webp' 
WHERE id = 'boyfriend-protective';

UPDATE personas 
SET icon = 'bf_2.webp' 
WHERE id = 'boyfriend-intellectual';

UPDATE personas 
SET icon = 'gf_3.webp' 
WHERE id = 'romantic-friend';

UPDATE personas 
SET icon = 'bf_3.webp' 
WHERE id = 'life-partner';

-- Log the update
DO $$
BEGIN
    RAISE NOTICE 'Updated % partner persona icons to use custom WebP images', 
        (SELECT COUNT(*) FROM personas WHERE is_partner_persona = true AND icon LIKE '%.webp');
END $$; 