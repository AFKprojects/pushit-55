
# Plan: Aktualizacja sekcji INDEXES w docs/schema.sql

## Cel
Doprowadzić sekcję INDEXES w pliku `docs/schema.sql` do 100% zgodności z rzeczywistym stanem bazy danych.

---

## Zidentyfikowane rozbieżności

Na podstawie porównania pg_indexes z bazą danych vs plik schema.sql:

### Indeksy ISTNIEJĄCE w DB ale BRAKUJĄCE/BŁĘDNE w pliku

| Tabela | Indeks w DB | Problem w pliku |
|--------|-------------|-----------------|
| polls | `idx_polls_expires_status` (partial) | Plik ma `idx_polls_active` - **inna nazwa** |
| polls | `idx_polls_hot_feed` (partial, composite) | Plik ma `idx_polls_hot` - **inna nazwa i struktura** |
| polls | `idx_polls_status_created` | **BRAK w pliku** |
| user_boosts | `idx_user_pushes_poll_id` | Plik ma `idx_user_boosts_poll` - **inna nazwa** |
| user_boosts | `idx_user_pushes_user_id` | Plik ma `idx_user_boosts_user` - **inna nazwa** |
| user_boosts | `idx_user_boosts_boosted_at` (DESC) | Plik ma bez DESC |
| user_votes | `idx_user_votes_user_poll` (composite) | Plik ma osobne `idx_user_votes_user` i `idx_user_votes_poll` - **nie istnieją w DB!** |
| user_votes | `idx_user_votes_voted_at` (DESC) | Plik ma bez DESC |
| saved_polls | `idx_saved_polls_user` (user_id, poll_id) | Plik ma `idx_saved_polls_user(user_id, saved_at DESC)` - **inna struktura** |
| poll_vote_holds | `idx_poll_vote_holds_poll_option` (composite) | Plik ma osobne `idx_poll_vote_holds_poll` i `idx_poll_vote_holds_option` - **nie istnieją w DB!** |
| user_badges | `idx_user_badges_badge` | **BRAK w pliku** |
| user_badges | `idx_user_badges_user` | **BRAK w pliku** |

### Indeksy w PLIKU których NIE MA w DB (fantomy)

| Tabela | Indeks w pliku | Status |
|--------|----------------|--------|
| polls | `idx_polls_active` | **NIE ISTNIEJE** - w DB jest `idx_polls_expires_status` |
| polls | `idx_polls_created_by` | **NIE ISTNIEJE w DB** |
| polls | `idx_polls_created_at` | **NIE ISTNIEJE w DB** |
| polls | `idx_polls_expires` | **NIE ISTNIEJE w DB** |
| polls | `idx_polls_hot` | **NIE ISTNIEJE** - w DB jest `idx_polls_hot_feed` |
| polls | `idx_polls_status` | **NIE ISTNIEJE w DB** |
| profiles | `idx_profiles_country` | **NIE ISTNIEJE w DB** |
| user_boosts | `idx_user_boosts_poll` | **NIE ISTNIEJE** - w DB jest `idx_user_pushes_poll_id` |
| user_boosts | `idx_user_boosts_user` | **NIE ISTNIEJE** - w DB jest `idx_user_pushes_user_id` |
| user_votes | `idx_user_votes_option` | **NIE ISTNIEJE w DB** |
| user_votes | `idx_user_votes_poll` | **NIE ISTNIEJE w DB** |
| user_votes | `idx_user_votes_user` | **NIE ISTNIEJE w DB** |
| poll_vote_holds | `idx_poll_vote_holds_poll` | **NIE ISTNIEJE w DB** |
| poll_vote_holds | `idx_poll_vote_holds_option` | **NIE ISTNIEJE w DB** |

---

## Dokładna lista indeksów z bazy danych (62 indeksy)

Pełna lista indeksów do wstawienia w pliku (pogrupowane wg tabeli):

### activity_events (8 indeksów)
```sql
-- PK
CREATE UNIQUE INDEX activity_events_pkey ON public.activity_events USING btree (id);
-- Regular
CREATE INDEX idx_activity_events_country_timestamp ON public.activity_events USING btree (country, timestamp_utc);
CREATE INDEX idx_activity_events_poll_timestamp ON public.activity_events USING btree (poll_id, timestamp_utc);
CREATE INDEX idx_activity_events_source_timestamp ON public.activity_events USING btree (source, timestamp_utc);
CREATE INDEX idx_activity_events_user_source_timestamp ON public.activity_events USING btree (user_id, source, timestamp_utc DESC);
CREATE INDEX idx_activity_events_user_timestamp ON public.activity_events USING btree (user_id, timestamp_utc);
-- Partial (for ranking)
CREATE INDEX idx_activity_events_country_ranking ON public.activity_events USING btree (source, timestamp_utc DESC, country) WHERE (source = 'country_button_counted'::text);
CREATE INDEX idx_activity_events_user_cooldown ON public.activity_events USING btree (user_id, source, timestamp_utc DESC) WHERE (source = 'country_button_counted'::text);
```

### badges (1 indeks)
```sql
CREATE UNIQUE INDEX badges_pkey ON public.badges USING btree (id);
```

### button_holds (4 indeksy)
```sql
CREATE UNIQUE INDEX button_holds_pkey ON public.button_holds USING btree (id);
CREATE INDEX idx_button_holds_active ON public.button_holds USING btree (is_active, last_heartbeat);
CREATE INDEX idx_button_holds_context ON public.button_holds USING btree (context_type, context_id);
CREATE INDEX idx_button_holds_active_heartbeat ON public.button_holds USING btree (is_active, last_heartbeat DESC) WHERE (is_active = true);
```

### daily_boost_limits (4 indeksy)
```sql
CREATE UNIQUE INDEX daily_push_limits_pkey ON public.daily_boost_limits USING btree (id);
CREATE UNIQUE INDEX daily_push_limits_user_id_push_date_key ON public.daily_boost_limits USING btree (user_id, boost_date);
CREATE INDEX idx_daily_boost_user_date ON public.daily_boost_limits USING btree (user_id, boost_date);
CREATE INDEX idx_daily_push_limits_user_date ON public.daily_boost_limits USING btree (user_id, boost_date);
```

### guest_previews (3 indeksy)
```sql
CREATE UNIQUE INDEX guest_previews_pkey ON public.guest_previews USING btree (id);
CREATE UNIQUE INDEX unique_device_date ON public.guest_previews USING btree (device_id, preview_date);
CREATE INDEX idx_guest_previews_device_date ON public.guest_previews USING btree (device_id, preview_date);
```

### hidden_polls (3 indeksy)
```sql
CREATE UNIQUE INDEX hidden_polls_pkey ON public.hidden_polls USING btree (id);
CREATE UNIQUE INDEX hidden_polls_poll_id_user_id_key ON public.hidden_polls USING btree (poll_id, user_id);
CREATE INDEX idx_hidden_polls_user ON public.hidden_polls USING btree (user_id, poll_id);
```

### poll_options (2 indeksy)
```sql
CREATE UNIQUE INDEX poll_options_pkey ON public.poll_options USING btree (id);
CREATE INDEX idx_poll_options_poll ON public.poll_options USING btree (poll_id);
```

### poll_response_options (2 indeksy)
```sql
CREATE UNIQUE INDEX poll_response_options_pkey ON public.poll_response_options USING btree (response_id, option_id);
CREATE INDEX idx_poll_response_options_option ON public.poll_response_options USING btree (option_id);
```

### poll_responses (5 indeksów)
```sql
CREATE UNIQUE INDEX poll_responses_pkey ON public.poll_responses USING btree (id);
CREATE UNIQUE INDEX poll_responses_poll_user_unique ON public.poll_responses USING btree (poll_id, user_id);
CREATE INDEX idx_poll_responses_poll_country ON public.poll_responses USING btree (poll_id, country);
CREATE INDEX idx_poll_responses_poll_submitted ON public.poll_responses USING btree (poll_id, submitted_at);
CREATE INDEX idx_poll_responses_user_submitted ON public.poll_responses USING btree (user_id, submitted_at);
```

### poll_vote_holds (4 indeksy)
```sql
CREATE UNIQUE INDEX poll_vote_holds_pkey ON public.poll_vote_holds USING btree (id);
CREATE INDEX idx_poll_vote_holds_active ON public.poll_vote_holds USING btree (is_active, last_heartbeat);
CREATE INDEX idx_poll_vote_holds_poll_option ON public.poll_vote_holds USING btree (poll_id, option_id);
CREATE INDEX idx_poll_vote_holds_user ON public.poll_vote_holds USING btree (user_id);
```

### polls (4 indeksy)
```sql
CREATE UNIQUE INDEX polls_pkey ON public.polls USING btree (id);
CREATE INDEX idx_polls_status_created ON public.polls USING btree (status, created_at DESC);
CREATE INDEX idx_polls_expires_status ON public.polls USING btree (expires_at, status) WHERE (status = 'active'::poll_status);
CREATE INDEX idx_polls_hot_feed ON public.polls USING btree (status, expires_at, boost_count_cache DESC, total_votes_cache DESC, created_at DESC) WHERE (status = 'active'::poll_status);
```

### profiles (2 indeksy)
```sql
CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);
CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username);
```

### saved_polls (3 indeksy)
```sql
CREATE UNIQUE INDEX saved_polls_pkey ON public.saved_polls USING btree (id);
CREATE UNIQUE INDEX saved_polls_poll_id_user_id_key ON public.saved_polls USING btree (poll_id, user_id);
CREATE INDEX idx_saved_polls_user ON public.saved_polls USING btree (user_id, poll_id);
```

### user_badges (4 indeksy)
```sql
CREATE UNIQUE INDEX user_badges_pkey ON public.user_badges USING btree (id);
CREATE UNIQUE INDEX user_badges_user_id_badge_id_key ON public.user_badges USING btree (user_id, badge_id);
CREATE INDEX idx_user_badges_badge ON public.user_badges USING btree (badge_id);
CREATE INDEX idx_user_badges_user ON public.user_badges USING btree (user_id);
```

### user_boosts (6 indeksów)
```sql
CREATE UNIQUE INDEX user_pushes_pkey ON public.user_boosts USING btree (id);
CREATE UNIQUE INDEX user_pushes_user_id_poll_id_key ON public.user_boosts USING btree (user_id, poll_id);
CREATE INDEX idx_user_boosts_boosted_at ON public.user_boosts USING btree (boosted_at DESC);
CREATE INDEX idx_user_boosts_user_poll ON public.user_boosts USING btree (user_id, poll_id);
CREATE INDEX idx_user_pushes_poll_id ON public.user_boosts USING btree (poll_id);
CREATE INDEX idx_user_pushes_user_id ON public.user_boosts USING btree (user_id);
```

### user_follows (4 indeksy)
```sql
CREATE UNIQUE INDEX user_follows_pkey ON public.user_follows USING btree (id);
CREATE UNIQUE INDEX user_follows_follower_id_followed_id_key ON public.user_follows USING btree (follower_id, followed_id);
CREATE INDEX idx_user_follows_followed ON public.user_follows USING btree (followed_id);
CREATE INDEX idx_user_follows_follower ON public.user_follows USING btree (follower_id);
```

### user_votes (4 indeksy)
```sql
CREATE UNIQUE INDEX user_votes_pkey ON public.user_votes USING btree (id);
CREATE UNIQUE INDEX user_votes_poll_id_user_id_key ON public.user_votes USING btree (poll_id, user_id);
CREATE INDEX idx_user_votes_user_poll ON public.user_votes USING btree (user_id, poll_id);
CREATE INDEX idx_user_votes_voted_at ON public.user_votes USING btree (voted_at DESC);
```

---

## Zmiany do wykonania

### 1. Wymienię całą sekcję INDEXES (linie 271-349)
Zastąpię ją nową sekcją zawierającą dokładnie 62 indeksy zgrupowane wg tabeli, z właściwymi nazwami i definicjami zgodnymi z `pg_indexes`.

### 2. Zaktualizuję sekcję podsumowania (linie ~1674)
Zmienię licznik z "47" na "62" indeksów i zaktualizuję szczegółowy podział.

---

## Szczegóły techniczne

### Plik: `docs/schema.sql`

**Lokalizacja zmiany 1:** Linie 271-349 (sekcja INDEXES)
- Usunięcie istniejącej sekcji
- Wstawienie nowej sekcji z 62 indeksami

**Lokalizacja zmiany 2:** Linie ~1674 (podsumowanie)
- Aktualizacja liczby indeksów

### Format nowej sekcji
Każdy indeks będzie zawierał:
- Dokładną nazwę z bazy danych
- Pełną definicję z `pg_indexes.indexdef`
- Grupowanie wg tabel (z komentarzami)
- Wyraźne oznaczenie partial indexes

---

## Podsumowanie rozbieżności

| Kategoria | Liczba |
|-----------|--------|
| Indeksy w DB | 62 |
| Indeksy w pliku (błędne) | ~35 |
| Indeksy fantomowe (nie istnieją w DB) | 14 |
| Indeksy z błędnymi nazwami | 6 |
| Indeksy z błędną strukturą | 4 |
