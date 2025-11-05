-- Add query_source column to track which tool created the research entry
ALTER TABLE keyword_research ADD COLUMN query_source TEXT;