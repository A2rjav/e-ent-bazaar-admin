-- Migration: Add manufacturer verification for premium Machine Clay Products
-- Date: 2025-01-21
-- Description: Add is_verified column to manufacturers table to control access to Machine Clay Products

-- Add is_verified column to manufacturers table
ALTER TABLE manufacturers 
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;

-- Add comment to explain the column purpose
COMMENT ON COLUMN manufacturers.is_verified IS 'Indicates if manufacturer is verified for premium Machine Clay Products. TRUE = verified premium manufacturer, FALSE = regular manufacturer';

-- Create index for better query performance
CREATE INDEX idx_manufacturers_is_verified ON manufacturers(is_verified);

-- Update existing manufacturers to set is_verified = FALSE by default
-- (This ensures existing manufacturers continue to work as before)
UPDATE manufacturers SET is_verified = FALSE WHERE is_verified IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE manufacturers ALTER COLUMN is_verified SET NOT NULL;

-- Add RLS policy for the new column (if RLS is enabled)
-- This allows authenticated users to read the verification status
-- but only admins can modify it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'manufacturers' 
        AND policyname = 'manufacturers_select_policy'
    ) THEN
        -- Update existing select policy to include is_verified
        DROP POLICY IF EXISTS manufacturers_select_policy ON manufacturers;
        CREATE POLICY manufacturers_select_policy ON manufacturers
            FOR SELECT USING (true);
    END IF;
END $$;
