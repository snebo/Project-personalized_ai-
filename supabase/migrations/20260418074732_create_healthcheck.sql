create table if not exists public.healthcheck (
  id int primary key
);

insert into public.healthcheck (id)
values (1)
on conflict (id) do nothing;