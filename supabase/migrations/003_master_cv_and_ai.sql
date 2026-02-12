-- Phase 3: Master CV system and AI infrastructure

-- Master CVs table
CREATE TABLE IF NOT EXISTS master_cvs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer DEFAULT 0,
  mime_type text DEFAULT 'application/pdf',
  extracted_text text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS for master_cvs
ALTER TABLE master_cvs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own CVs" ON master_cvs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for quick active CV lookup
CREATE INDEX IF NOT EXISTS idx_master_cvs_user_active ON master_cvs(user_id, is_active) WHERE is_active = true;

-- Add match_score_details to applications for storing AI analysis results
ALTER TABLE applications ADD COLUMN IF NOT EXISTS match_analysis jsonb;

-- Add generated_text column to cover_letters if it doesn't exist
ALTER TABLE cover_letters ADD COLUMN IF NOT EXISTS generated_text text;
ALTER TABLE cover_letters ADD COLUMN IF NOT EXISTS instructions text;
ALTER TABLE cover_letters ADD COLUMN IF NOT EXISTS match_analysis jsonb;

-- Storage bucket for master CVs (may already exist from migration 001)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('master-cvs', 'master-cvs', false, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for master-cvs bucket (skip if already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users upload own master CVs' AND tablename = 'objects') THEN
    CREATE POLICY "Users upload own master CVs" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'master-cvs' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users read own master CVs' AND tablename = 'objects') THEN
    CREATE POLICY "Users read own master CVs" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'master-cvs' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users delete own master CVs' AND tablename = 'objects') THEN
    CREATE POLICY "Users delete own master CVs" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'master-cvs' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;
