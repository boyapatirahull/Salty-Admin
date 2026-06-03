-- Add status column to feedback table so admins can track review state
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'unread'
    CHECK (status IN ('unread', 'read', 'actioned'));

-- Index for filtering by status in the admin feedback inbox
CREATE INDEX IF NOT EXISTS feedback_status_idx ON public.feedback(status);
