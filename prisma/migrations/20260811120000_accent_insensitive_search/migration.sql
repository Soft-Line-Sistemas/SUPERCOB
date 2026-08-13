-- Search fields use an accent-insensitive, case-insensitive collation so Prisma
-- `contains` filters match, for example, "Antonio" with "Antônio".
-- This changes comparison behavior only; stored and displayed text is untouched.

BEGIN TRY
  BEGIN TRANSACTION;

ALTER TABLE [dbo].[Cliente]
  ALTER COLUMN [nome] NVARCHAR(1000) COLLATE Latin1_General_100_CI_AI NOT NULL;

ALTER TABLE [dbo].[Cliente]
  ALTER COLUMN [email] NVARCHAR(1000) COLLATE Latin1_General_100_CI_AI NULL;

ALTER TABLE [dbo].[Cliente]
  ALTER COLUMN [cidade] NVARCHAR(1000) COLLATE Latin1_General_100_CI_AI NULL;

ALTER TABLE [dbo].[Cliente]
  ALTER COLUMN [estado] NVARCHAR(1000) COLLATE Latin1_General_100_CI_AI NULL;

ALTER TABLE [dbo].[ClienteArquivado]
  ALTER COLUMN [nome] NVARCHAR(1000) COLLATE Latin1_General_100_CI_AI NOT NULL;

ALTER TABLE [dbo].[ClienteArquivado]
  ALTER COLUMN [email] NVARCHAR(1000) COLLATE Latin1_General_100_CI_AI NULL;

ALTER TABLE [dbo].[ClienteArquivado]
  ALTER COLUMN [cidade] NVARCHAR(1000) COLLATE Latin1_General_100_CI_AI NULL;

ALTER TABLE [dbo].[ClienteArquivado]
  ALTER COLUMN [estado] NVARCHAR(1000) COLLATE Latin1_General_100_CI_AI NULL;

ALTER TABLE [dbo].[Usuario]
  ALTER COLUMN [nome] NVARCHAR(1000) COLLATE Latin1_General_100_CI_AI NOT NULL;

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0
    ROLLBACK TRANSACTION;
  THROW;
END CATCH;
