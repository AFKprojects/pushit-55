-- Add country column to button_holds table to track location of each button press
ALTER TABLE public.button_holds 
ADD COLUMN country text;