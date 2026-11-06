CREATE TABLE IF NOT EXISTS audit_log(id bigserial PRIMARY KEY,at timestamptz NOT NULL DEFAULT now(),user_id text,email text,event text NOT NULL,detail text NOT NULL DEFAULT '',ip text NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS audit_log_at ON audit_log(at DESC);
CREATE INDEX IF NOT EXISTS audit_log_user ON audit_log(user_id,at DESC)
