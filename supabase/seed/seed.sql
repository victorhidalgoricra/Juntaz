-- Demo-only seed data (requires valid auth.users ids)
insert into public.profiles (id, nombre, celular, email, dni)
values
  ('11111111-1111-1111-1111-111111111111', 'Ana Torres', '999111222', 'ana@example.com', '44556677'),
  ('22222222-2222-2222-2222-222222222222', 'Luis Rojas', '988777666', 'luis@example.com', '12345678')
on conflict do nothing;

insert into public.juntas (id, admin_id, nombre, descripcion, moneda, participantes_max, monto_cuota, frecuencia_pago, fecha_inicio, dia_limite_pago, visibilidad, estado)
values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Junta Barrio Centro', 'Grupo piloto de validación', 'PEN', 5, 200, 'semanal', current_date, 5, 'privada', 'activa')
on conflict do nothing;

insert into public.junta_members (junta_id, profile_id, estado, rol, orden_turno)
values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'activo', 'admin', 1),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'activo', 'participante', 2)
on conflict do nothing;
