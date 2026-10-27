-- No seed data. Discovery and engineering decisions must come from real evidence.
begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.staff_role as enum ('operator','engineer','admin');
create type public.qualification_state as enum ('discovered','contact_review','capability_review','qualified','rejected','suspended');
create type public.rfq_status as enum ('draft','reviewing','sourcing','quoted','closed');
create type public.engineering_state as enum ('pending','approved','changes_requested');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  created_at timestamptz not null default now()
);
create table public.staff_memberships (
  organization_id uuid not null references public.organizations(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.staff_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  unique (user_id) -- V0: one workspace per staff account; no organization switcher.
);

-- Intentional narrow definer lookup avoids recursive membership RLS.
-- No user-editable JWT metadata participates in authorization.
create function private.staff_role(org uuid) returns text
language sql stable security definer set search_path = '' as $$
  select m.role::text from public.staff_memberships m
  join auth.users u on u.id = m.user_id
  where m.organization_id = org and m.user_id = (select auth.uid())
    and m.active and not coalesce(u.is_anonymous, false)
$$;
revoke all on function private.staff_role(uuid) from public, anon;
grant execute on function private.staff_role(uuid) to authenticated;

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  city text not null check (char_length(btrim(city)) between 1 and 120),
  region text not null check (char_length(btrim(region)) between 1 and 120),
  processes text not null check (char_length(btrim(processes)) between 1 and 2000),
  materials text not null check (char_length(btrim(materials)) between 1 and 2000),
  source_reference text not null check (char_length(btrim(source_reference)) between 1 and 2000),
  source_url text check (source_url ~ '^https?://[^[:space:]]+$' and char_length(source_url) <= 2000),
  observed_on date not null check (observed_on <= current_date),
  qualification_state public.qualification_state not null default 'discovered',
  qualification_scope text check (char_length(qualification_scope) <= 2000),
  evidence_reference text check (char_length(evidence_reference) <= 4000),
  review_note text check (char_length(review_note) <= 4000),
  qualified_by uuid references auth.users(id),
  qualified_at timestamptz,
  qualification_expires_on date,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  unique (organization_id, id),
  check (qualification_state <> 'qualified' or (
    char_length(btrim(qualification_scope)) > 0 and qualification_scope is not null and
    char_length(btrim(evidence_reference)) > 0 and evidence_reference is not null and
    qualified_by is not null and qualified_at is not null and qualification_expires_on is not null))
);
create unique index suppliers_identity_idx on public.suppliers(organization_id, lower(btrim(name)), lower(btrim(city)));
create index suppliers_queue_idx on public.suppliers(organization_id, qualification_state, created_at desc, id);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  reference text not null check (char_length(btrim(reference)) between 1 and 2000),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  unique (organization_id, id)
);
create unique index customers_identity_idx on public.customers(organization_id, lower(btrim(name)));

create table public.rfqs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  customer_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  part_description text not null check (char_length(btrim(part_description)) between 1 and 4000),
  drawing_reference text check (char_length(drawing_reference) <= 2000),
  quantity integer not null check (quantity between 1 and 1000000000),
  unit text not null check (char_length(btrim(unit)) between 1 and 40),
  target_date date,
  status public.rfq_status not null default 'draft',
  engineering_state public.engineering_state not null default 'pending',
  engineering_note text check (char_length(engineering_note) <= 4000),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  foreign key (organization_id, customer_id) references public.customers(organization_id, id),
  check (status not in ('sourcing','quoted') or engineering_state = 'approved')
);
create index rfqs_queue_idx on public.rfqs(organization_id, status, created_at desc, id);
create index rfqs_customer_idx on public.rfqs(organization_id, customer_id);

create table public.review_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  entity_type text not null check (entity_type in ('supplier','rfq')),
  entity_id uuid not null,
  from_state text,
  to_state text not null,
  note text,
  evidence_reference text,
  scope text,
  qualification_expires_on date,
  actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index review_events_entity_idx on public.review_events(organization_id, entity_type, entity_id, created_at desc);

create function private.guard_record() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare actor_role text := private.staff_role(new.organization_id);
begin
  if auth.uid() is null or actor_role is null then raise exception 'Active staff access required' using errcode = '42501'; end if;
  if tg_op = 'INSERT' then
    new.created_by := auth.uid(); new.created_at := now(); new.version := 1;
  else
    if new.organization_id <> old.organization_id or new.id <> old.id or new.created_by <> old.created_by or new.created_at <> old.created_at then
      raise exception 'Record identity is immutable' using errcode = '23514';
    end if;
    new.version := old.version + 1;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function private.guard_record() from public, anon, authenticated;

create function private.guard_supplier() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare actor_role text := private.staff_role(new.organization_id); changed boolean;
begin
  if tg_op = 'INSERT' then
    if new.qualification_state <> 'discovered' then raise exception 'New suppliers must start discovered' using errcode = '23514'; end if;
    new.qualified_by := null; new.qualified_at := null; new.qualification_expires_on := null;
    new.qualification_scope := null; new.evidence_reference := null; new.review_note := null;
    return new;
  end if;
  changed := row(new.qualification_state, new.qualification_scope, new.evidence_reference, new.review_note, new.qualification_expires_on)
    is distinct from row(old.qualification_state, old.qualification_scope, old.evidence_reference, old.review_note, old.qualification_expires_on);
  if new.qualification_state <> old.qualification_state and not (
    (old.qualification_state = 'discovered' and new.qualification_state in ('contact_review','rejected')) or
    (old.qualification_state = 'contact_review' and new.qualification_state in ('capability_review','rejected')) or
    (old.qualification_state = 'capability_review' and new.qualification_state in ('qualified','rejected')) or
    (old.qualification_state = 'qualified' and new.qualification_state in ('suspended','capability_review')) or
    (old.qualification_state = 'rejected' and new.qualification_state = 'contact_review') or
    (old.qualification_state = 'suspended' and new.qualification_state in ('capability_review','rejected'))
  ) then raise exception 'Invalid qualification transition' using errcode = '23514'; end if;
  if changed and coalesce(char_length(btrim(new.review_note)), 0) = 0 then
    raise exception 'A review note is required' using errcode = '23514';
  end if;
  if new.qualification_state = 'qualified' then
    if row(new.processes, new.materials, new.city, new.region, new.name) is distinct from row(old.processes, old.materials, old.city, old.region, old.name) then
      raise exception 'Capability changes require a new review' using errcode = '23514';
    end if;
    if changed then
      if actor_role not in ('engineer','admin') then raise exception 'Engineering role required' using errcode = '42501'; end if;
      if new.qualification_expires_on is null or new.qualification_expires_on <= current_date or new.qualification_expires_on > current_date + 365 then
        raise exception 'Qualification expiry must be within the next year' using errcode = '23514';
      end if;
      new.qualified_by := auth.uid(); new.qualified_at := now();
    else
      new.qualified_by := old.qualified_by; new.qualified_at := old.qualified_at;
    end if;
  else
    new.qualified_by := null; new.qualified_at := null; new.qualification_expires_on := null;
  end if;
  return new;
end $$;
revoke all on function private.guard_supplier() from public, anon, authenticated;

create function private.guard_rfq() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare actor_role text := private.staff_role(new.organization_id);
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.engineering_state <> 'pending' then raise exception 'RFQs start as pending drafts' using errcode = '23514'; end if;
    new.reviewed_by := null; new.reviewed_at := null; new.engineering_note := null;
    return new;
  end if;
  if row(new.customer_id, new.title, new.part_description, new.drawing_reference, new.quantity, new.unit, new.target_date)
    is distinct from row(old.customer_id, old.title, old.part_description, old.drawing_reference, old.quantity, old.unit, old.target_date) then
    new.engineering_state := 'pending'; new.engineering_note := null; new.reviewed_by := null; new.reviewed_at := null;
    new.status := 'reviewing';
  elsif row(new.engineering_state, new.engineering_note) is distinct from row(old.engineering_state, old.engineering_note) then
    if actor_role not in ('engineer','admin') then raise exception 'Engineering role required' using errcode = '42501'; end if;
    if coalesce(char_length(btrim(new.engineering_note)),0) = 0 then raise exception 'Engineering note required' using errcode = '23514'; end if;
    new.reviewed_by := auth.uid(); new.reviewed_at := now();
  else
    new.reviewed_by := old.reviewed_by; new.reviewed_at := old.reviewed_at;
  end if;
  if new.status <> old.status and not (
    (old.status = 'draft' and new.status in ('reviewing','closed')) or
    (old.status = 'reviewing' and new.status in ('sourcing','closed')) or
    (old.status = 'sourcing' and new.status in ('reviewing','quoted','closed')) or
    (old.status = 'quoted' and new.status in ('reviewing','closed')) or
    (old.status = 'closed' and new.status = 'reviewing')
  ) then raise exception 'Invalid RFQ transition' using errcode = '23514'; end if;
  return new;
end $$;
revoke all on function private.guard_rfq() from public, anon, authenticated;

-- Trigger-only audit writer. Not exposed as an RPC; callers cannot forge events.
create function private.record_review() returns trigger
language plpgsql security definer set search_path = '' as $$
declare previous text; next_state text; review_changed boolean;
begin
  if auth.uid() is null or private.staff_role(new.organization_id) is null then raise exception 'Staff required' using errcode = '42501'; end if;
  if tg_table_name = 'suppliers' then
    next_state := new.qualification_state;
    if tg_op = 'UPDATE' then previous := old.qualification_state;
      review_changed := row(new.qualification_state,new.qualification_scope,new.evidence_reference,new.review_note,new.qualification_expires_on) is distinct from row(old.qualification_state,old.qualification_scope,old.evidence_reference,old.review_note,old.qualification_expires_on);
    end if;
    if tg_op = 'INSERT' or review_changed then
      insert into public.review_events(organization_id,entity_type,entity_id,from_state,to_state,note,evidence_reference,scope,qualification_expires_on,actor_id)
      values(new.organization_id,'supplier',new.id,previous,next_state,new.review_note,new.evidence_reference,new.qualification_scope,new.qualification_expires_on,auth.uid());
    end if;
  else
    next_state := new.status || '/' || new.engineering_state;
    if tg_op = 'UPDATE' then previous := old.status || '/' || old.engineering_state;
      review_changed := row(new.status,new.engineering_state,new.engineering_note,new.reviewed_at) is distinct from row(old.status,old.engineering_state,old.engineering_note,old.reviewed_at);
    end if;
    if tg_op = 'INSERT' or review_changed then
      insert into public.review_events(organization_id,entity_type,entity_id,from_state,to_state,note,actor_id)
      values(new.organization_id,'rfq',new.id,previous,next_state,new.engineering_note,auth.uid());
    end if;
  end if;
  return new;
end $$;
revoke all on function private.record_review() from public, anon, authenticated;

create trigger a_record_guard before insert or update on public.suppliers for each row execute function private.guard_record();
create trigger b_qualification_guard before insert or update on public.suppliers for each row execute function private.guard_supplier();
create trigger supplier_review after insert or update on public.suppliers for each row execute function private.record_review();
create trigger a_record_guard before insert or update on public.customers for each row execute function private.guard_record();
create trigger a_record_guard before insert or update on public.rfqs for each row execute function private.guard_record();
create trigger b_engineering_guard before insert or update on public.rfqs for each row execute function private.guard_rfq();
create trigger rfq_review after insert or update on public.rfqs for each row execute function private.record_review();

-- Explicit grants remain required independently of RLS, including on hosted projects.
revoke all on public.organizations,public.staff_memberships,public.suppliers,public.customers,public.rfqs,public.review_events from anon,authenticated;
grant select on public.organizations,public.staff_memberships,public.review_events to authenticated;
grant select,insert,update on public.suppliers,public.customers,public.rfqs to authenticated;
-- Membership/organization provisioning is an out-of-band operator action, not an app role.
alter table public.organizations enable row level security;
alter table public.staff_memberships enable row level security;
alter table public.suppliers enable row level security;
alter table public.customers enable row level security;
alter table public.rfqs enable row level security;
alter table public.review_events enable row level security;
create policy organization_read on public.organizations for select to authenticated using (private.staff_role(id) is not null);
create policy own_membership_read on public.staff_memberships for select to authenticated using (user_id = (select auth.uid()) and active);
create policy supplier_read on public.suppliers for select to authenticated using (private.staff_role(organization_id) is not null);
create policy supplier_insert on public.suppliers for insert to authenticated with check (private.staff_role(organization_id) is not null);
create policy supplier_update on public.suppliers for update to authenticated using (private.staff_role(organization_id) is not null) with check (private.staff_role(organization_id) is not null);
create policy customer_read on public.customers for select to authenticated using (private.staff_role(organization_id) is not null);
create policy customer_insert on public.customers for insert to authenticated with check (private.staff_role(organization_id) is not null);
create policy customer_update on public.customers for update to authenticated using (private.staff_role(organization_id) is not null) with check (private.staff_role(organization_id) is not null);
create policy rfq_read on public.rfqs for select to authenticated using (private.staff_role(organization_id) is not null);
create policy rfq_insert on public.rfqs for insert to authenticated with check (private.staff_role(organization_id) is not null);
create policy rfq_update on public.rfqs for update to authenticated using (private.staff_role(organization_id) is not null) with check (private.staff_role(organization_id) is not null);
create policy events_read on public.review_events for select to authenticated using (private.staff_role(organization_id) is not null);
commit;
