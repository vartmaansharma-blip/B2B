begin;
alter table public.rfqs add constraint rfqs_organization_identity unique (organization_id,id);

-- A requirement revision is independent of ordinary workflow/version updates.
alter table public.rfqs add column requirements_version integer not null default 1 check (requirements_version > 0);
create function private.version_rfq_requirements() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' then new.requirements_version := 1;
  elsif row(new.title,new.part_description,new.drawing_reference,new.drawing_revision,new.quantity,new.unit,new.target_date)
    is distinct from row(old.title,old.part_description,old.drawing_reference,old.drawing_revision,old.quantity,old.unit,old.target_date) then
    new.requirements_version := old.requirements_version + 1;
  else new.requirements_version := old.requirements_version;
  end if;
  return new;
end $$;
revoke all on function private.version_rfq_requirements() from public,anon,authenticated;
create trigger c_requirements_version before insert or update on public.rfqs for each row execute function private.version_rfq_requirements();

-- Append-only reported observations, never a qualification or automated match.
create table public.supplier_capabilities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  supplier_id uuid not null,
  process text not null check (char_length(btrim(process)) between 1 and 200),
  material text not null check (char_length(btrim(material)) between 1 and 200),
  tolerance_notes text not null check (char_length(btrim(tolerance_notes)) between 1 and 2000),
  inspection_notes text not null check (char_length(btrim(inspection_notes)) between 1 and 2000),
  evidence_reference text not null check (char_length(btrim(evidence_reference)) between 1 and 4000),
  observed_on date not null check (observed_on <= current_date),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  unique (organization_id,supplier_id,id),
  foreign key (organization_id,supplier_id) references public.suppliers(organization_id,id)
);
create index capabilities_search_idx on public.supplier_capabilities(organization_id,created_at desc,id);
create index capabilities_creator_idx on public.supplier_capabilities(created_by);
create function private.guard_capability() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or private.staff_role(new.organization_id) is null then raise exception 'Active staff required' using errcode = '42501'; end if;
  new.created_by := auth.uid(); new.created_at := now();
  return new;
end $$;
revoke all on function private.guard_capability() from public,anon,authenticated;
create trigger capability_guard before insert on public.supplier_capabilities for each row execute function private.guard_capability();

create table public.rfq_shortlists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  rfq_id uuid not null,
  supplier_id uuid not null,
  capability_id uuid not null,
  requirements_version integer not null check (requirements_version > 0),
  supplier_version integer not null check (supplier_version > 0),
  state text not null default 'proposed' check (state in ('proposed','accepted','removed')),
  review_note text not null check (char_length(btrim(review_note)) between 1 and 4000),
  fit_evidence_reference text check (char_length(fit_evidence_reference) <= 4000),
  requirements_snapshot jsonb not null default '{}',
  supplier_snapshot jsonb not null default '{}',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  rfq_reviewed_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  unique (organization_id,rfq_id,supplier_id),
  unique (organization_id,rfq_id,id),
  foreign key (organization_id,rfq_id) references public.rfqs(organization_id,id),
  foreign key (organization_id,supplier_id,capability_id) references public.supplier_capabilities(organization_id,supplier_id,id)
);
create index shortlist_capability_idx on public.rfq_shortlists(organization_id,supplier_id,capability_id);
create index shortlist_reviewer_idx on public.rfq_shortlists(reviewed_by);
create index shortlist_creator_idx on public.rfq_shortlists(created_by);

create table public.shortlist_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  rfq_id uuid not null,
  shortlist_id uuid not null,
  from_state text,
  to_state text not null,
  note text not null,
  snapshot jsonb not null,
  actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (organization_id,rfq_id,shortlist_id) references public.rfq_shortlists(organization_id,rfq_id,id)
);
create index shortlist_events_record_idx on public.shortlist_events(organization_id,rfq_id,shortlist_id,created_at desc,id);
create index shortlist_events_actor_idx on public.shortlist_events(actor_id);

create function private.guard_shortlist() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare r public.rfqs; s public.suppliers; c public.supplier_capabilities;
begin
  -- Lock parents while validating and snapshotting; edits cannot race acceptance.
  select * into r from public.rfqs where organization_id=new.organization_id and id=new.rfq_id for share;
  select * into s from public.suppliers where organization_id=new.organization_id and id=new.supplier_id for share;
  select * into c from public.supplier_capabilities where organization_id=new.organization_id and supplier_id=new.supplier_id and id=new.capability_id;
  if r.id is null or s.id is null or c.id is null then raise exception 'Related records unavailable' using errcode = '23514'; end if;
  if tg_op = 'INSERT' then
    if new.state <> 'proposed' then raise exception 'Shortlists start proposed' using errcode = '23514'; end if;
  else
    if row(new.rfq_id,new.supplier_id) is distinct from row(old.rfq_id,old.supplier_id) then raise exception 'Shortlist identity is immutable' using errcode = '23514'; end if;
    if new.state <> 'proposed' and row(new.capability_id,new.requirements_version,new.supplier_version) is distinct from row(old.capability_id,old.requirements_version,old.supplier_version) then
      raise exception 'Repropose before changing reviewed scope' using errcode = '23514';
    end if;
    if new.state = 'accepted' and old.state <> 'proposed' then raise exception 'Propose before acceptance' using errcode = '23514'; end if;
  end if;
  if new.state <> 'removed' then
    if r.status = 'closed' then raise exception 'RFQ is closed' using errcode = '23514'; end if;
    if new.requirements_version <> r.requirements_version or new.supplier_version <> s.version then raise exception 'Requirements or supplier changed; repropose' using errcode = '23514'; end if;
  end if;
  if new.state = 'proposed' then
    new.reviewed_by := null; new.reviewed_at := null; new.fit_evidence_reference := null;
    new.rfq_reviewed_at := null;
    new.requirements_snapshot := jsonb_build_object('title',r.title,'part_description',r.part_description,'drawing_reference',r.drawing_reference,'drawing_revision',r.drawing_revision,'quantity',r.quantity,'unit',r.unit,'target_date',r.target_date,'requirements_version',r.requirements_version);
    new.supplier_snapshot := jsonb_build_object('name',s.name,'qualification_state',s.qualification_state,'qualification_scope',s.qualification_scope,'evidence_reference',s.evidence_reference,'qualification_expires_on',s.qualification_expires_on,'version',s.version,'capability',to_jsonb(c));
  else
    new.requirements_snapshot := old.requirements_snapshot; new.supplier_snapshot := old.supplier_snapshot;
    if new.state = 'accepted' then
      if private.staff_role(new.organization_id) not in ('engineer','admin') then raise exception 'Engineering role required' using errcode = '42501'; end if;
      if r.engineering_state <> 'approved' or r.status not in ('reviewing','sourcing') then raise exception 'Reviewed and approved RFQ required' using errcode = '23514'; end if;
      if new.rfq_reviewed_at is distinct from r.reviewed_at then raise exception 'Engineering decision changed; refresh' using errcode = '23514'; end if;
      if s.qualification_state <> 'qualified' or s.qualification_expires_on is null or s.qualification_expires_on <= current_date then raise exception 'Current supplier qualification required' using errcode = '23514'; end if;
      if coalesce(char_length(btrim(new.fit_evidence_reference)),0) = 0 then raise exception 'Part-specific fit evidence required' using errcode = '23514'; end if;
      new.reviewed_by := auth.uid(); new.reviewed_at := now();
      new.rfq_reviewed_at := r.reviewed_at;
    else
      new.reviewed_by := old.reviewed_by; new.reviewed_at := old.reviewed_at;
      new.rfq_reviewed_at := old.rfq_reviewed_at;
      new.fit_evidence_reference := old.fit_evidence_reference;
    end if;
  end if;
  return new;
end $$;
revoke all on function private.guard_shortlist() from public,anon,authenticated;
create trigger a_record_guard before insert or update on public.rfq_shortlists for each row execute function private.guard_record();
create trigger b_shortlist_guard before insert or update on public.rfq_shortlists for each row execute function private.guard_shortlist();

create function private.record_shortlist() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or private.staff_role(new.organization_id) is null then raise exception 'Active staff required' using errcode = '42501'; end if;
  insert into public.shortlist_events(organization_id,rfq_id,shortlist_id,from_state,to_state,note,snapshot,actor_id)
    values(new.organization_id,new.rfq_id,new.id,case when tg_op='UPDATE' then old.state end,new.state,new.review_note,to_jsonb(new),auth.uid());
  return new;
end $$;
revoke all on function private.record_shortlist() from public,anon,authenticated;
create trigger shortlist_history after insert or update on public.rfq_shortlists for each row execute function private.record_shortlist();

revoke all on public.supplier_capabilities,public.rfq_shortlists,public.shortlist_events from public,anon,authenticated;
grant select,insert on public.supplier_capabilities to authenticated;
grant select,insert,update on public.rfq_shortlists to authenticated;
grant select on public.shortlist_events to authenticated;
alter table public.supplier_capabilities enable row level security;
alter table public.rfq_shortlists enable row level security;
alter table public.shortlist_events enable row level security;
create policy capability_read on public.supplier_capabilities for select to authenticated using (private.staff_role(organization_id) is not null);
create policy capability_insert on public.supplier_capabilities for insert to authenticated with check (private.staff_role(organization_id) is not null);
create policy shortlist_read on public.rfq_shortlists for select to authenticated using (private.staff_role(organization_id) is not null);
create policy shortlist_insert on public.rfq_shortlists for insert to authenticated with check (private.staff_role(organization_id) is not null);
create policy shortlist_update on public.rfq_shortlists for update to authenticated using (private.staff_role(organization_id) is not null) with check (private.staff_role(organization_id) is not null);
create policy shortlist_event_read on public.shortlist_events for select to authenticated using (private.staff_role(organization_id) is not null);

-- Stored decisions are history. Consumers must use this caller-scoped live status.
create view public.rfq_shortlist_status with (security_invoker = true) as
select e.*, case
  when e.state='removed' then 'removed'
  when r.status='closed' or e.requirements_version<>r.requirements_version or e.supplier_version<>s.version then 'needs_review'
  when e.state='accepted' and (
    r.engineering_state<>'approved' or r.status not in ('reviewing','sourcing','quoted') or
    e.rfq_reviewed_at is distinct from r.reviewed_at or
    s.qualification_state<>'qualified' or s.qualification_expires_on is null or s.qualification_expires_on<=current_date
  ) then 'needs_review'
  else e.state end as effective_state
from public.rfq_shortlists e
join public.rfqs r on r.organization_id=e.organization_id and r.id=e.rfq_id
join public.suppliers s on s.organization_id=e.organization_id and s.id=e.supplier_id;
revoke all on public.rfq_shortlist_status from public,anon,authenticated;
grant select on public.rfq_shortlist_status to authenticated;
commit;
