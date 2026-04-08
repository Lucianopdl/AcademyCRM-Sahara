-- Add receipt_number column to payments table for receipt tracking history
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS receipt_number TEXT;

-- Create index for faster lookups by receipt number
CREATE INDEX IF NOT EXISTS idx_payments_receipt_number ON public.payments(receipt_number);

-- Backfill existing payments with generated receipt numbers
UPDATE public.payments
SET receipt_number = 'REC-' || UPPER(LEFT(REPLACE(id::text, '-', ''), 8))
WHERE receipt_number IS NULL;
