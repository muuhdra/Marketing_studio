-- Migration: durée des vidéos générées → coût estimé au prorata (Kling/Seedance facturés à la seconde).

alter table generated_outputs add column if not exists duration_seconds integer;
