-- ============================================================
-- Srijan / AgroSmart — Mobile app accounts
-- Run ONCE in Supabase → SQL Editor (after the master schema).
--
-- Design:
--   * app_users holds farmer accounts. Each account is linked to a
--     farm_profiles.farm_id, which scopes all device data in the app.
--   * Passwords are bcrypt-hashed (pgcrypto). The app never sees hashes.
--   * RLS is ON with NO policies, so the anon/publishable key cannot read
--     these tables directly. The app only talks to them through the
--     SECURITY DEFINER functions below.
--   * Login returns a session token (app_sessions) that the app stores
--     on the phone and sends with every account call.
--
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ------------------------------------------------------------
-- TABLES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_users (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    phone           VARCHAR(16)     UNIQUE NOT NULL
                    CHECK (phone ~ '^\+[0-9]{10,15}$'),          -- E.164, e.g. +919876543210
    password_hash   TEXT            NOT NULL,
    full_name       VARCHAR(80)     NOT NULL,
    email           VARCHAR(120),
    village         VARCHAR(80),
    district        VARCHAR(80),
    state           VARCHAR(80),
    pin_code        VARCHAR(10),
    farm_id         VARCHAR(32)     REFERENCES public.farm_profiles(farm_id) ON UPDATE CASCADE,
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_app_users_farm_id ON public.app_users(farm_id);

CREATE TABLE IF NOT EXISTS public.app_sessions (
    token           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    last_used_at    TIMESTAMPTZ     DEFAULT NOW(),
    expires_at      TIMESTAMPTZ     DEFAULT NOW() + INTERVAL '60 days'
);

CREATE INDEX IF NOT EXISTS idx_app_sessions_user ON public.app_sessions(user_id);

COMMENT ON TABLE public.app_users IS
    'Mobile app farmer accounts. Linked to farm_profiles via farm_id. Access only via app_* RPC functions.';
COMMENT ON TABLE public.app_sessions IS
    'Opaque login tokens for the mobile app. Access only via app_* RPC functions.';

ALTER TABLE public.app_users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_users    FROM anon, authenticated;
REVOKE ALL ON public.app_sessions FROM anon, authenticated;

-- ------------------------------------------------------------
-- INTERNAL HELPERS (not callable by the app)
-- ------------------------------------------------------------

-- Public view of a user row (never includes password_hash)
CREATE OR REPLACE FUNCTION public._app_user_json(u public.app_users)
RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
    SELECT to_jsonb(u) - 'password_hash';
$$;

-- Resolve a session token to a user id, or raise SESSION_EXPIRED
CREATE OR REPLACE FUNCTION public._app_session_user(p_token UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
    v_user UUID;
BEGIN
    UPDATE app_sessions
       SET last_used_at = NOW()
     WHERE token = p_token AND expires_at > NOW()
    RETURNING user_id INTO v_user;

    IF v_user IS NULL THEN
        RAISE EXCEPTION 'SESSION_EXPIRED';
    END IF;
    RETURN v_user;
END;
$$;

-- Create a fresh session and return { token, user }
CREATE OR REPLACE FUNCTION public._app_new_session(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
    v_token UUID;
    v_user  app_users;
BEGIN
    DELETE FROM app_sessions WHERE user_id = p_user_id AND expires_at <= NOW();
    INSERT INTO app_sessions(user_id) VALUES (p_user_id) RETURNING token INTO v_token;
    UPDATE app_users SET last_login_at = NOW() WHERE id = p_user_id RETURNING * INTO v_user;
    RETURN jsonb_build_object('token', v_token, 'user', _app_user_json(v_user));
END;
$$;

REVOKE ALL ON FUNCTION public._app_user_json(public.app_users) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._app_session_user(UUID)          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._app_new_session(UUID)           FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- PUBLIC RPC FUNCTIONS (called by the app)
-- Errors are raised with short codes the app translates:
--   PHONE_TAKEN, FARM_NOT_FOUND, INVALID_CREDENTIALS, WEAK_PASSWORD,
--   NAME_REQUIRED, INVALID_PHONE, SESSION_EXPIRED, OTP_INVALID,
--   PHONE_NOT_REGISTERED
-- ------------------------------------------------------------

-- Is this phone already registered?
CREATE OR REPLACE FUNCTION public.app_phone_registered(p_phone TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER
SET search_path = public, extensions AS $$
    SELECT EXISTS (SELECT 1 FROM app_users WHERE phone = p_phone);
$$;

-- Create the next farm (FARM_002, FARM_003, …) with default agronomic
-- constants. The defaults match FARM_001; edit them later in farm_profiles
-- (or from Node B) once the farmer's field is measured.
CREATE OR REPLACE FUNCTION public._app_create_farm()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
    v_next    INT;
    v_farm_id TEXT;
BEGIN
    -- Serialize concurrent registrations so two users can't get the same ID
    PERFORM pg_advisory_xact_lock(hashtext('app_create_farm'));

    SELECT coalesce(max(substring(farm_id FROM '^FARM_([0-9]+)$')::INT), 0) + 1
      INTO v_next
      FROM farm_profiles
     WHERE farm_id ~ '^FARM_[0-9]+$';

    v_farm_id := 'FARM_' || lpad(v_next::TEXT, 3, '0');

    INSERT INTO farm_profiles (
        farm_id, field_id, node_id,
        crop_id, growth_stage, profile_version,
        field_area_m2, root_depth_m,
        field_capacity_vwc, wilting_point_vwc,
        mad_percent, irrigation_efficiency,
        max_daily_l, max_dose_l, rain_lock_mm,
        stab_delay_min, default_zone_id
    ) VALUES (
        v_farm_id, 'FIELD_A', 'NODE_B_' || lpad(v_next::TEXT, 2, '0'),
        0, 0, 1,
        1200, 0.4,
        32, 14,
        50, 82,
        6000, 2000, 5,
        30, 1
    );
    RETURN v_farm_id;
END;
$$;

REVOKE ALL ON FUNCTION public._app_create_farm() FROM PUBLIC, anon, authenticated;

-- Register a new account and log in.
-- p_farm_id NULL/blank → a new farm is created and assigned automatically.
-- p_farm_id given      → links to that existing farm (farmer who already has a device).
DROP FUNCTION IF EXISTS public.app_register(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.app_register(
    p_phone     TEXT,
    p_password  TEXT,
    p_full_name TEXT,
    p_farm_id   TEXT DEFAULT NULL,
    p_email     TEXT DEFAULT NULL,
    p_village   TEXT DEFAULT NULL,
    p_district  TEXT DEFAULT NULL,
    p_state     TEXT DEFAULT NULL,
    p_pin_code  TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
    v_id      UUID;
    v_farm_id TEXT := upper(nullif(btrim(p_farm_id), ''));
BEGIN
    IF p_phone IS NULL OR p_phone !~ '^\+[0-9]{10,15}$' THEN
        RAISE EXCEPTION 'INVALID_PHONE';
    END IF;
    IF coalesce(length(p_password), 0) < 6 THEN
        RAISE EXCEPTION 'WEAK_PASSWORD';
    END IF;
    IF coalesce(btrim(p_full_name), '') = '' THEN
        RAISE EXCEPTION 'NAME_REQUIRED';
    END IF;
    IF EXISTS (SELECT 1 FROM app_users WHERE phone = p_phone) THEN
        RAISE EXCEPTION 'PHONE_TAKEN';
    END IF;

    IF v_farm_id IS NULL THEN
        v_farm_id := _app_create_farm();
    ELSIF NOT EXISTS (SELECT 1 FROM farm_profiles WHERE farm_id = v_farm_id) THEN
        RAISE EXCEPTION 'FARM_NOT_FOUND';
    END IF;

    INSERT INTO app_users (phone, password_hash, full_name, farm_id,
                           email, village, district, state, pin_code)
    VALUES (p_phone, crypt(p_password, gen_salt('bf')), btrim(p_full_name),
            v_farm_id,
            nullif(btrim(p_email), ''), nullif(btrim(p_village), ''),
            nullif(btrim(p_district), ''), nullif(btrim(p_state), ''),
            nullif(btrim(p_pin_code), ''))
    RETURNING id INTO v_id;

    RETURN _app_new_session(v_id);
END;
$$;

-- Log in with phone + password
CREATE OR REPLACE FUNCTION public.app_login(p_phone TEXT, p_password TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
    v_user app_users;
BEGIN
    SELECT * INTO v_user FROM app_users WHERE phone = p_phone;
    IF v_user.id IS NULL OR v_user.password_hash <> crypt(p_password, v_user.password_hash) THEN
        RAISE EXCEPTION 'INVALID_CREDENTIALS';
    END IF;
    RETURN _app_new_session(v_user.id);
END;
$$;

-- Current user's profile
CREATE OR REPLACE FUNCTION public.app_get_profile(p_token UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
    v_id   UUID := _app_session_user(p_token);
    v_user app_users;
BEGIN
    SELECT * INTO v_user FROM app_users WHERE id = v_id;
    RETURN _app_user_json(v_user);
END;
$$;

-- Update profile fields (NULL = leave unchanged, '' = clear optional field)
CREATE OR REPLACE FUNCTION public.app_update_profile(
    p_token     UUID,
    p_full_name TEXT DEFAULT NULL,
    p_email     TEXT DEFAULT NULL,
    p_village   TEXT DEFAULT NULL,
    p_district  TEXT DEFAULT NULL,
    p_state     TEXT DEFAULT NULL,
    p_pin_code  TEXT DEFAULT NULL,
    p_farm_id   TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
    v_id   UUID := _app_session_user(p_token);
    v_user app_users;
BEGIN
    IF p_full_name IS NOT NULL AND btrim(p_full_name) = '' THEN
        RAISE EXCEPTION 'NAME_REQUIRED';
    END IF;
    IF p_farm_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM farm_profiles WHERE farm_id = upper(btrim(p_farm_id))) THEN
        RAISE EXCEPTION 'FARM_NOT_FOUND';
    END IF;

    UPDATE app_users SET
        full_name  = coalesce(btrim(p_full_name), full_name),
        email      = CASE WHEN p_email    IS NULL THEN email    ELSE nullif(btrim(p_email), '')    END,
        village    = CASE WHEN p_village  IS NULL THEN village  ELSE nullif(btrim(p_village), '')  END,
        district   = CASE WHEN p_district IS NULL THEN district ELSE nullif(btrim(p_district), '') END,
        state      = CASE WHEN p_state    IS NULL THEN state    ELSE nullif(btrim(p_state), '')    END,
        pin_code   = CASE WHEN p_pin_code IS NULL THEN pin_code ELSE nullif(btrim(p_pin_code), '') END,
        farm_id    = coalesce(upper(btrim(p_farm_id)), farm_id),
        updated_at = NOW()
    WHERE id = v_id
    RETURNING * INTO v_user;

    RETURN _app_user_json(v_user);
END;
$$;

-- Change password (requires current password); signs out other devices
CREATE OR REPLACE FUNCTION public.app_change_password(
    p_token UUID, p_old_password TEXT, p_new_password TEXT
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
    v_id   UUID := _app_session_user(p_token);
    v_hash TEXT;
BEGIN
    SELECT password_hash INTO v_hash FROM app_users WHERE id = v_id;
    IF v_hash <> crypt(p_old_password, v_hash) THEN
        RAISE EXCEPTION 'INVALID_CREDENTIALS';
    END IF;
    IF coalesce(length(p_new_password), 0) < 6 THEN
        RAISE EXCEPTION 'WEAK_PASSWORD';
    END IF;

    UPDATE app_users SET password_hash = crypt(p_new_password, gen_salt('bf')), updated_at = NOW()
     WHERE id = v_id;
    DELETE FROM app_sessions WHERE user_id = v_id AND token <> p_token;
    RETURN TRUE;
END;
$$;

-- Forgot password (SMS OTP via Firebase Phone Auth).
--
-- The app verifies the OTP with Firebase and receives a Firebase ID token.
-- This function does NOT trust the app: it sends the token to Google's
-- Identity Toolkit (accounts:lookup), which validates the signature/expiry
-- and returns the phone number that was actually verified by SMS. Only the
-- account with that phone number gets the new password.
--
-- Requires the `http` extension (synchronous HTTP from Postgres).
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Old, weaker reset (phone + Farm ID) — removed in favour of OTP.
DROP FUNCTION IF EXISTS public.app_reset_password(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.app_reset_password_otp(
    p_firebase_id_token TEXT, p_new_password TEXT
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
    -- Firebase Web API key of project agrosmart-d4a8b (public, same as in the app)
    c_api_key CONSTANT TEXT := 'AIzaSyBoZb_2nh1QV-R0g87qi_8sE7jIUhLJzOc';
    v_resp    http_response;
    v_phone   TEXT;
    v_id      UUID;
BEGIN
    IF coalesce(length(p_new_password), 0) < 6 THEN
        RAISE EXCEPTION 'WEAK_PASSWORD';
    END IF;
    IF coalesce(p_firebase_id_token, '') = '' THEN
        RAISE EXCEPTION 'OTP_INVALID';
    END IF;

    SELECT * INTO v_resp FROM http_post(
        'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' || c_api_key,
        json_build_object('idToken', p_firebase_id_token)::TEXT,
        'application/json'
    );

    IF v_resp.status <> 200 THEN
        RAISE EXCEPTION 'OTP_INVALID';
    END IF;

    v_phone := (v_resp.content::JSONB -> 'users' -> 0 ->> 'phoneNumber');
    IF v_phone IS NULL THEN
        RAISE EXCEPTION 'OTP_INVALID';
    END IF;

    SELECT id INTO v_id FROM app_users WHERE phone = v_phone;
    IF v_id IS NULL THEN
        RAISE EXCEPTION 'PHONE_NOT_REGISTERED';
    END IF;

    UPDATE app_users SET password_hash = crypt(p_new_password, gen_salt('bf')), updated_at = NOW()
     WHERE id = v_id;
    DELETE FROM app_sessions WHERE user_id = v_id;   -- sign out everywhere
    RETURN TRUE;
END;
$$;

-- Log out (invalidate this token)
CREATE OR REPLACE FUNCTION public.app_logout(p_token UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER
SET search_path = public, extensions AS $$
    DELETE FROM app_sessions WHERE token = p_token RETURNING TRUE;
$$;

GRANT EXECUTE ON FUNCTION public.app_phone_registered(TEXT)                                   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_register(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_login(TEXT, TEXT)                                        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_get_profile(UUID)                                        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_update_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_change_password(UUID, TEXT, TEXT)                        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_reset_password_otp(TEXT, TEXT)                           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_logout(UUID)                                             TO anon, authenticated;

-- Make PostgREST pick up the new functions immediately
NOTIFY pgrst, 'reload schema';
