-- ============================================================================
-- Migration 001: Multi-Exchange Portfolio Dashboard
-- High-Security Database Architecture with 7 Layers of Defense
-- ============================================================================

-- ============================================================================
-- 1. SCHEMA ISOLATION
-- vault_private schema is NEVER exposed via PostgREST REST API
-- Only public schema is in PGRST_DB_SCHEMAS
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS vault_private;

-- ============================================================================
-- 2. DEDICATED DB ROLE — minimal permissions for credential operations
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'credential_manager') THEN
    CREATE ROLE credential_manager NOINHERIT NOLOGIN;
  END IF;
END
$$;

-- Grant minimal permissions to credential_manager
GRANT USAGE ON SCHEMA vault_private TO credential_manager;

-- ============================================================================
-- 3. PUBLIC TABLES — exposed via PostgREST
-- ============================================================================

-- profiles — extends NextAuth user
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  provider TEXT DEFAULT 'unknown',
  username_slug TEXT UNIQUE,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- portfolio_snapshots — cached data for public dashboards
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_user_id ON public.portfolio_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON public.portfolio_snapshots(created_at DESC);

-- ============================================================================
-- 4. VAULT_PRIVATE TABLES — hidden from REST API, RPC-only access
-- ============================================================================

-- exchange_credentials — double-encrypted key blobs
CREATE TABLE IF NOT EXISTS vault_private.exchange_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL CHECK (exchange IN ('binance', 'okx', 'bybit', 'upbit', 'bithumb')),
  label TEXT NOT NULL DEFAULT 'Main Account',
  -- Client-side encrypted blob (AES-256-GCM)
  -- In a full pgsodium setup, this would be double-encrypted.
  -- For now we store the client-encrypted blob directly.
  encrypted_blob TEXT NOT NULL,
  iv TEXT NOT NULL,
  salt TEXT NOT NULL,
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, exchange, label)
);

CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON vault_private.exchange_credentials(user_id);

-- Grant credential_manager access to this table
GRANT SELECT, INSERT, UPDATE, DELETE ON vault_private.exchange_credentials TO credential_manager;

-- credential_audit_log — append-only audit trail
CREATE TABLE IF NOT EXISTS vault_private.credential_audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,  -- No FK — survives account deletion for forensics
  credential_id UUID,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'SELECT', 'UPDATE', 'DELETE', 'RATE_LIMITED')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id ON vault_private.credential_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON vault_private.credential_audit_log(created_at);

GRANT INSERT, SELECT ON vault_private.credential_audit_log TO credential_manager;

-- rate_limit_state — per-user sliding window
CREATE TABLE IF NOT EXISTS vault_private.rate_limit_state (
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('credential_read', 'credential_write')),
  window_start TIMESTAMPTZ DEFAULT now(),
  request_count INT DEFAULT 0,
  PRIMARY KEY (user_id, action)
);

GRANT SELECT, INSERT, UPDATE ON vault_private.rate_limit_state TO credential_manager;

-- Grant sequence usage to credential_manager
GRANT USAGE ON ALL SEQUENCES IN SCHEMA vault_private TO credential_manager;

-- ============================================================================
-- 5. ROW LEVEL SECURITY — FORCE enabled on all tables
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_snapshots FORCE ROW LEVEL SECURITY;

ALTER TABLE vault_private.exchange_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_private.exchange_credentials FORCE ROW LEVEL SECURITY;

ALTER TABLE vault_private.credential_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_private.credential_audit_log FORCE ROW LEVEL SECURITY;

ALTER TABLE vault_private.rate_limit_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_private.rate_limit_state FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================

-- profiles: users can read/update their own profile
CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (true);
CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY profiles_insert ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Allow service role to manage profiles (for NextAuth callbacks)
CREATE POLICY profiles_service_insert ON public.profiles FOR INSERT
  TO service_role WITH CHECK (true);
CREATE POLICY profiles_service_update ON public.profiles FOR UPDATE
  TO service_role USING (true);

-- portfolio_snapshots: owner can CRUD, anyone can read public snapshots
CREATE POLICY snapshots_owner ON public.portfolio_snapshots
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY snapshots_public_read ON public.portfolio_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = portfolio_snapshots.user_id
      AND profiles.is_public = true
    )
  );

-- vault_private policies — only credential_manager role can access
-- These are accessed ONLY via SECURITY DEFINER RPC functions
CREATE POLICY credentials_manager_all ON vault_private.exchange_credentials
  FOR ALL TO credential_manager USING (true) WITH CHECK (true);

CREATE POLICY audit_manager_all ON vault_private.credential_audit_log
  FOR ALL TO credential_manager USING (true) WITH CHECK (true);

CREATE POLICY rate_limit_manager_all ON vault_private.rate_limit_state
  FOR ALL TO credential_manager USING (true) WITH CHECK (true);

-- ============================================================================
-- 7. RATE LIMITING FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION vault_private.check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_max_requests INT DEFAULT 30,
  p_window_minutes INT DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET ROLE credential_manager
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INT;
BEGIN
  -- Get or create rate limit state
  SELECT window_start, request_count INTO v_window_start, v_count
  FROM vault_private.rate_limit_state
  WHERE user_id = p_user_id AND action = p_action
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO vault_private.rate_limit_state (user_id, action, window_start, request_count)
    VALUES (p_user_id, p_action, now(), 1);
    RETURN TRUE;
  END IF;

  -- Check if window has expired
  IF v_window_start + (p_window_minutes || ' minutes')::INTERVAL < now() THEN
    UPDATE vault_private.rate_limit_state
    SET window_start = now(), request_count = 1
    WHERE user_id = p_user_id AND action = p_action;
    RETURN TRUE;
  END IF;

  -- Check if within limit
  IF v_count >= p_max_requests THEN
    -- Log the rate limit hit
    INSERT INTO vault_private.credential_audit_log (user_id, operation, metadata)
    VALUES (p_user_id, 'RATE_LIMITED', jsonb_build_object('action', p_action, 'count', v_count));
    RETURN FALSE;
  END IF;

  -- Increment counter
  UPDATE vault_private.rate_limit_state
  SET request_count = request_count + 1
  WHERE user_id = p_user_id AND action = p_action;

  RETURN TRUE;
END;
$$;

-- ============================================================================
-- 8. RPC FUNCTIONS — The ONLY way to access credentials
-- ============================================================================

-- store_credential: validate → rate-limit → store → audit
CREATE OR REPLACE FUNCTION public.store_credential(
  p_exchange TEXT,
  p_label TEXT,
  p_encrypted_blob TEXT,
  p_iv TEXT,
  p_salt TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET ROLE credential_manager
AS $$
DECLARE
  v_user_id UUID;
  v_credential_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Rate limit check (10 writes per 15 minutes)
  IF NOT vault_private.check_rate_limit(v_user_id, 'credential_write', 10, 15) THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please try again later.';
  END IF;

  -- Validate exchange
  IF p_exchange NOT IN ('binance', 'okx', 'bybit', 'upbit', 'bithumb') THEN
    RAISE EXCEPTION 'Invalid exchange: %', p_exchange;
  END IF;

  -- Upsert credential
  INSERT INTO vault_private.exchange_credentials (user_id, exchange, label, encrypted_blob, iv, salt)
  VALUES (v_user_id, p_exchange, p_label, p_encrypted_blob, p_iv, p_salt)
  ON CONFLICT (user_id, exchange, label) DO UPDATE
  SET encrypted_blob = EXCLUDED.encrypted_blob,
      iv = EXCLUDED.iv,
      salt = EXCLUDED.salt,
      updated_at = now()
  RETURNING id INTO v_credential_id;

  -- Audit log
  INSERT INTO vault_private.credential_audit_log (user_id, credential_id, operation, metadata)
  VALUES (v_user_id, v_credential_id, 'INSERT', jsonb_build_object('exchange', p_exchange, 'label', p_label));

  RETURN v_credential_id;
END;
$$;

-- get_credential: rate-limit → fetch → return client blob → audit
CREATE OR REPLACE FUNCTION public.get_credential(
  p_exchange TEXT,
  p_label TEXT DEFAULT 'Main Account'
)
RETURNS TABLE(id UUID, encrypted_blob TEXT, iv TEXT, salt TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET ROLE credential_manager
AS $$
DECLARE
  v_user_id UUID;
  v_credential_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Rate limit check (30 reads per 15 minutes)
  IF NOT vault_private.check_rate_limit(v_user_id, 'credential_read', 30, 15) THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please try again later.';
  END IF;

  -- Update last_accessed_at and return
  RETURN QUERY
  UPDATE vault_private.exchange_credentials ec
  SET last_accessed_at = now()
  WHERE ec.user_id = v_user_id
    AND ec.exchange = p_exchange
    AND ec.label = p_label
  RETURNING ec.id, ec.encrypted_blob, ec.iv, ec.salt;

  -- Get credential_id for audit
  SELECT ec.id INTO v_credential_id
  FROM vault_private.exchange_credentials ec
  WHERE ec.user_id = v_user_id AND ec.exchange = p_exchange AND ec.label = p_label;

  -- Audit log
  IF v_credential_id IS NOT NULL THEN
    INSERT INTO vault_private.credential_audit_log (user_id, credential_id, operation, metadata)
    VALUES (v_user_id, v_credential_id, 'SELECT', jsonb_build_object('exchange', p_exchange, 'label', p_label));
  END IF;
END;
$$;

-- list_credentials: returns metadata only (NO blobs)
CREATE OR REPLACE FUNCTION public.list_credentials()
RETURNS TABLE(id UUID, exchange TEXT, label TEXT, last_accessed_at TIMESTAMPTZ, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET ROLE credential_manager
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT ec.id, ec.exchange, ec.label, ec.last_accessed_at, ec.created_at
  FROM vault_private.exchange_credentials ec
  WHERE ec.user_id = v_user_id
  ORDER BY ec.exchange, ec.label;
END;
$$;

-- delete_credential: ownership check → delete → audit
CREATE OR REPLACE FUNCTION public.delete_credential(p_credential_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET ROLE credential_manager
AS $$
DECLARE
  v_user_id UUID;
  v_exchange TEXT;
  v_label TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get credential info for audit before deleting
  SELECT exchange, label INTO v_exchange, v_label
  FROM vault_private.exchange_credentials
  WHERE id = p_credential_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credential not found or access denied';
  END IF;

  -- Delete
  DELETE FROM vault_private.exchange_credentials
  WHERE id = p_credential_id AND user_id = v_user_id;

  -- Audit log
  INSERT INTO vault_private.credential_audit_log (user_id, credential_id, operation, metadata)
  VALUES (v_user_id, p_credential_id, 'DELETE', jsonb_build_object('exchange', v_exchange, 'label', v_label));

  RETURN TRUE;
END;
$$;

-- get_credential_audit_log: user's own audit trail
CREATE OR REPLACE FUNCTION public.get_credential_audit_log(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(id BIGINT, credential_id UUID, operation TEXT, metadata JSONB, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET ROLE credential_manager
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT cal.id, cal.credential_id, cal.operation, cal.metadata, cal.created_at
  FROM vault_private.credential_audit_log cal
  WHERE cal.user_id = v_user_id
  ORDER BY cal.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ============================================================================
-- 9. CLEANUP — auto-delete old audit logs (run via pg_cron if available)
-- ============================================================================

-- Function to clean up old audit logs (> 90 days)
CREATE OR REPLACE FUNCTION vault_private.cleanup_old_audit_logs()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET ROLE credential_manager
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM vault_private.credential_audit_log
  WHERE created_at < now() - INTERVAL '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ============================================================================
-- 10. GRANT EXECUTE ON RPC FUNCTIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.store_credential TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_credential TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_credentials TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_credential TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_credential_audit_log TO authenticated;
