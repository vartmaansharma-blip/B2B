-- Forward-only change. Do not rewrite the applied V0 migration.
-- Existing approved RFQs must first be returned to review by an accountable engineer.
-- This intentionally fails closed if an older deployment has approved records without revisions.
begin;
alter table public.rfqs
  add column drawing_revision text check (char_length(drawing_revision) <= 120),
  add column amendment_note text check (char_length(amendment_note) <= 4000),
  add constraint rfq_controlled_drawing_approval check (
    engineering_state <> 'approved' or (
      coalesce(char_length(btrim(drawing_reference)),0) > 0 and
      coalesce(char_length(btrim(drawing_revision)),0) > 0
    )
  );
alter table public.review_events
  add column requirements_before jsonb,
  add column requirements_after jsonb;
-- These columns inherit the existing staff-only grants and organization-scoped RLS.
-- Only the existing trigger-only ledger writer can create events. No snapshots are invented for old events.
create or replace function private.guard_rfq() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare actor_role text := private.staff_role(new.organization_id);
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.engineering_state <> 'pending' then raise exception 'RFQs start as pending drafts' using errcode = '23514'; end if;
    new.reviewed_by := null; new.reviewed_at := null; new.engineering_note := null; new.amendment_note := null;
    return new;
  end if;
  if new.customer_id <> old.customer_id then
    raise exception 'Customer identity is immutable; create a new RFQ' using errcode = '23514';
  end if;
  if row(new.title, new.part_description, new.drawing_reference, new.drawing_revision, new.quantity, new.unit, new.target_date)
    is distinct from row(old.title, old.part_description, old.drawing_reference, old.drawing_revision, old.quantity, old.unit, old.target_date) then
    if coalesce(char_length(btrim(new.amendment_note)),0) = 0 then
      raise exception 'Amendment reason required' using errcode = '23514';
    end if;
    new.engineering_state := 'pending'; new.engineering_note := null; new.reviewed_by := null; new.reviewed_at := null;
    new.status := 'reviewing';
  elsif new.amendment_note is distinct from old.amendment_note then
    raise exception 'Amendment must change at least one requirement' using errcode = '23514';
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

create or replace function private.record_review() returns trigger
language plpgsql security definer set search_path = '' as $$
declare previous text; next_state text; review_changed boolean; before_requirements jsonb; after_requirements jsonb; requirements_changed boolean := false;
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
    after_requirements := jsonb_build_object(
      'customer_id',new.customer_id,'title',new.title,'part_description',new.part_description,
      'drawing_reference',new.drawing_reference,'drawing_revision',new.drawing_revision,
      'quantity',new.quantity,'unit',new.unit,'target_date',new.target_date,'version',new.version);
    if tg_op = 'UPDATE' then
      before_requirements := jsonb_build_object(
        'customer_id',old.customer_id,'title',old.title,'part_description',old.part_description,
        'drawing_reference',old.drawing_reference,'drawing_revision',old.drawing_revision,
        'quantity',old.quantity,'unit',old.unit,'target_date',old.target_date,'version',old.version);
      requirements_changed := (after_requirements - 'version') is distinct from (before_requirements - 'version');
    end if;
    next_state := new.status || '/' || new.engineering_state;
    if tg_op = 'UPDATE' then previous := old.status || '/' || old.engineering_state;
      review_changed := row(new.status,new.engineering_state,new.engineering_note,new.reviewed_at) is distinct from row(old.status,old.engineering_state,old.engineering_note,old.reviewed_at);
    end if;
    if tg_op = 'INSERT' or review_changed or requirements_changed then
      insert into public.review_events(organization_id,entity_type,entity_id,from_state,to_state,note,actor_id,requirements_before,requirements_after)
      values(new.organization_id,'rfq',new.id,previous,next_state,
        case when requirements_changed then new.amendment_note else new.engineering_note end,auth.uid(),
        case when requirements_changed then before_requirements end,
        after_requirements);

    end if;
  end if;
  return new;
end $$;
revoke all on function private.record_review() from public, anon, authenticated;

commit;
