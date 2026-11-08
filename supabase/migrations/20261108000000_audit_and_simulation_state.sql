create table if not exists public.system_audit_trail (
  event_id text primary key,
  subsystem text not null,
  action_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  execution_duration_ms integer not null default 0,
  occurred_at timestamptz not null default now()
);

create index if not exists system_audit_trail_occurred_at_idx
  on public.system_audit_trail (occurred_at desc);

create table if not exists public.pasarin_simulation_state (
  id text primary key,
  revision bigint not null check (revision > 0),
  state jsonb not null
);

alter table public.system_audit_trail enable row level security;
alter table public.pasarin_simulation_state enable row level security;

revoke all on public.system_audit_trail, public.pasarin_simulation_state from public, anon, authenticated;
grant select, insert on public.system_audit_trail to service_role;
grant select, insert, update on public.pasarin_simulation_state to service_role;
