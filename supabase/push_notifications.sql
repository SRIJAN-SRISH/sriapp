-- ============================================================
-- Srijan — Push notifications (Expo Push Service)
-- Run ONCE in Supabase → SQL Editor, after app_users.sql.
-- Safe to re-run.
--
-- How it works:
--   * When a user logs in, the app asks for notification permission and
--     saves its Expo push token here (app_register_push_token).
--   * YOU send notifications from the SQL Editor:
--
--       -- everyone
--       SELECT app_send_push('Title', 'Message');
--       -- only users linked to one farm
--       SELECT app_send_push('Title', 'Message', 'FARM_001');
--
--   * app_send_push is NOT callable from the app (no grant to anon), so
--     nobody else can send notifications to your users.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.app_push_tokens (
    push_token  TEXT        PRIMARY KEY,                 -- ExponentPushToken[...]
    user_id     UUID        NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    platform    VARCHAR(10),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_push_tokens_user ON public.app_push_tokens(user_id);

ALTER TABLE public.app_push_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_push_tokens FROM anon, authenticated;

COMMENT ON TABLE public.app_push_tokens IS
    'Expo push tokens per logged-in device. Written via app_register_push_token; read by app_send_push.';

-- ------------------------------------------------------------
-- Called by the app after login (session token required)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_register_push_token(
    p_token UUID, p_push_token TEXT, p_platform TEXT DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
    v_id UUID := _app_session_user(p_token);
BEGIN
    IF p_push_token IS NULL OR p_push_token !~ '^Expo(nent)?PushToken\[.+\]$' THEN
        RAISE EXCEPTION 'INVALID_PUSH_TOKEN';
    END IF;

    -- A device token belongs to whoever logged in on that phone most recently
    INSERT INTO app_push_tokens (push_token, user_id, platform)
    VALUES (p_push_token, v_id, p_platform)
    ON CONFLICT (push_token)
    DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, updated_at = NOW();
    RETURN TRUE;
END;
$$;

-- Called by the app on logout (stop notifications to this phone)
CREATE OR REPLACE FUNCTION public.app_unregister_push_token(p_token UUID, p_push_token TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
    v_id UUID := _app_session_user(p_token);
BEGIN
    DELETE FROM app_push_tokens WHERE push_token = p_push_token AND user_id = v_id;
    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_register_push_token(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_unregister_push_token(UUID, TEXT)     TO anon, authenticated;

-- ------------------------------------------------------------
-- ADMIN ONLY — send a notification (run from the SQL Editor)
-- Returns a summary: how many phones were targeted, accepted, failed.
-- Tokens Expo reports as "DeviceNotRegistered" (app uninstalled) are removed.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_send_push(
    p_title   TEXT,
    p_body    TEXT,
    p_farm_id TEXT DEFAULT NULL       -- NULL = all users
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
    v_tokens   TEXT[];
    v_chunk    TEXT[];
    v_messages JSONB;
    v_resp     http_response;
    v_tickets  JSONB;
    v_ok       INT := 0;
    v_failed   INT := 0;
    v_removed  INT := 0;
    v_errors   JSONB := '[]'::JSONB;
    i          INT;
    j          INT;
BEGIN
    SELECT array_agg(t.push_token ORDER BY t.updated_at DESC)
      INTO v_tokens
      FROM app_push_tokens t
      JOIN app_users u ON u.id = t.user_id
     WHERE p_farm_id IS NULL OR u.farm_id = upper(btrim(p_farm_id));

    IF v_tokens IS NULL THEN
        RETURN jsonb_build_object('targeted', 0, 'note', 'No devices have registered for notifications yet.');
    END IF;

    -- Expo accepts up to 100 messages per request
    FOR i IN 0 .. (array_length(v_tokens, 1) - 1) / 100 LOOP
        v_chunk := v_tokens[i * 100 + 1 : i * 100 + 100];

        SELECT jsonb_agg(jsonb_build_object(
                   'to', tok,
                   'title', p_title,
                   'body', p_body,
                   'sound', 'default',
                   'priority', 'high',
                   'channelId', 'alerts'
               ) ORDER BY ord)
          INTO v_messages
          FROM unnest(v_chunk) WITH ORDINALITY AS x(tok, ord);

        SELECT * INTO v_resp FROM http_post(
            'https://exp.host/--/api/v2/push/send',
            v_messages::TEXT,
            'application/json'
        );

        IF v_resp.status <> 200 THEN
            v_failed := v_failed + array_length(v_chunk, 1);
            v_errors := v_errors || jsonb_build_array(left(v_resp.content, 300));
            CONTINUE;
        END IF;

        -- One ticket per message, in the same order
        v_tickets := v_resp.content::JSONB -> 'data';
        FOR j IN 0 .. jsonb_array_length(v_tickets) - 1 LOOP
            IF v_tickets -> j ->> 'status' = 'ok' THEN
                v_ok := v_ok + 1;
            ELSE
                v_failed := v_failed + 1;
                v_errors := v_errors || jsonb_build_array(v_tickets -> j -> 'message');
                IF v_tickets -> j -> 'details' ->> 'error' = 'DeviceNotRegistered' THEN
                    DELETE FROM app_push_tokens WHERE push_token = v_chunk[j + 1];
                    v_removed := v_removed + 1;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'targeted', array_length(v_tokens, 1),
        'accepted', v_ok,
        'failed', v_failed,
        'removed_dead_tokens', v_removed,
        'errors', v_errors
    );
END;
$$;

REVOKE ALL ON FUNCTION public.app_send_push(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
