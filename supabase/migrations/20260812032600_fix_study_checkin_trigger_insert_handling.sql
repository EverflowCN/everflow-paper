create or replace function public.log_course_checkin_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.done then
      insert into public.study_checkin_events(user_id,event_type,source_id,item_id,subject,occurred_at,metadata)
      values (new.user_id,'course','course_states',new.course_id,new.subject,coalesce(new.completed_at,new.updated_at,now()),jsonb_build_object('device_id',coalesce(new.device_id,'')));
    end if;
  elsif new.done and not coalesce(old.done,false) then
    insert into public.study_checkin_events(user_id,event_type,source_id,item_id,subject,occurred_at,metadata)
    values (new.user_id,'course','course_states',new.course_id,new.subject,coalesce(new.completed_at,new.updated_at,now()),jsonb_build_object('device_id',coalesce(new.device_id,'')));
  end if;
  return new;
end;
$$;

create or replace function public.log_practice_checkin_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status in ('done','mastered') then
      insert into public.study_checkin_events(user_id,event_type,source_id,item_id,subject,occurred_at,metadata)
      values (new.user_id,'practice',new.practice_id,new.item_id,new.subject,coalesce(new.first_done_at,new.last_attempt_at,new.updated_at,now()),jsonb_build_object('status',new.status));
    end if;
  elsif new.status in ('done','mastered') and old.status not in ('done','mastered') then
    insert into public.study_checkin_events(user_id,event_type,source_id,item_id,subject,occurred_at,metadata)
    values (new.user_id,'practice',new.practice_id,new.item_id,new.subject,coalesce(new.first_done_at,new.last_attempt_at,new.updated_at,now()),jsonb_build_object('status',new.status));
  end if;
  return new;
end;
$$;
