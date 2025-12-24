-- Create workflows table
CREATE TABLE public.workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Untitled Workflow',
  description TEXT,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Public access for now (no auth)
CREATE POLICY "Allow public read access on workflows"
ON public.workflows FOR SELECT
USING (true);

CREATE POLICY "Allow public insert on workflows"
ON public.workflows FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update on workflows"
ON public.workflows FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete on workflows"
ON public.workflows FOR DELETE
USING (true);

-- Create documents table for knowledge base
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Public access for documents
CREATE POLICY "Allow public read access on documents"
ON public.documents FOR SELECT
USING (true);

CREATE POLICY "Allow public insert on documents"
ON public.documents FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public delete on documents"
ON public.documents FOR DELETE
USING (true);

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true);

-- Storage policies
CREATE POLICY "Allow public upload to documents bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow public read from documents bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

CREATE POLICY "Allow public delete from documents bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents');

-- Update trigger for workflows
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workflows_updated_at
BEFORE UPDATE ON public.workflows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();