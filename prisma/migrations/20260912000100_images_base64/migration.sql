BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';

-- Reuse existing columns, with case-sensitive text suitable for base64.
ALTER TABLE empresas ALTER COLUMN "logoUrl" TYPE text USING "logoUrl"::text;
ALTER TABLE estoques ALTER COLUMN "imageUrl" TYPE text USING "imageUrl"::text;
ALTER TABLE estoques ALTER COLUMN "imageUrls" TYPE text[] USING "imageUrls"::text[];

-- Discard remote references; preserve inline images. No network downloads.
UPDATE empresas SET "logoUrl" = NULL
WHERE "logoUrl" IS NOT NULL AND "logoUrl" !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$';
UPDATE estoques SET "imageUrl" = NULL
WHERE "imageUrl" IS NOT NULL AND "imageUrl" !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$';
UPDATE estoques SET "imageUrls" = ARRAY(
    SELECT image FROM unnest("imageUrls") WITH ORDINALITY AS images(image, position)
    WHERE image ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$'
    ORDER BY position
) WHERE EXISTS (
    SELECT 1 FROM unnest("imageUrls") AS image
    WHERE image IS NULL OR image !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$'
);

COMMIT;
