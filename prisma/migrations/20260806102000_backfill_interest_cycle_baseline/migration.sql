-- Some databases had these columns before the interest-cycle migration, with
-- nullable values. Prisma now models the baseline as mandatory, so normalize
-- legacy rows before enforcing that invariant.
UPDATE [dbo].[Emprestimo]
SET [jurosPagosNoInicioCiclo] = 0
WHERE [jurosPagosNoInicioCiclo] IS NULL;

ALTER TABLE [dbo].[Emprestimo]
ALTER COLUMN [jurosPagosNoInicioCiclo] FLOAT(53) NOT NULL;

UPDATE [dbo].[EmprestimoArquivado]
SET [jurosPagosNoInicioCiclo] = 0
WHERE [jurosPagosNoInicioCiclo] IS NULL;

ALTER TABLE [dbo].[EmprestimoArquivado]
ALTER COLUMN [jurosPagosNoInicioCiclo] FLOAT(53) NOT NULL;
