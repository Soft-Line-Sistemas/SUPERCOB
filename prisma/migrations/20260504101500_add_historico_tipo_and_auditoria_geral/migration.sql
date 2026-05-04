BEGIN TRY

BEGIN TRAN;

IF COL_LENGTH('dbo.EmprestimoHistorico', 'tipo') IS NULL
BEGIN
    ALTER TABLE [dbo].[EmprestimoHistorico] ADD [tipo] VARCHAR(20);
END;

IF OBJECT_ID('dbo.AuditoriaGeral', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AuditoriaGeral] (
        [id] NVARCHAR(1000) NOT NULL,
        [autorId] NVARCHAR(1000),
        [entidade] VARCHAR(50) NOT NULL,
        [entidadeId] VARCHAR(50) NOT NULL,
        [acao] VARCHAR(50) NOT NULL,
        [detalhes] TEXT,
        [antes] TEXT,
        [depois] TEXT,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditoriaGeral_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [AuditoriaGeral_pkey] PRIMARY KEY CLUSTERED ([id])
    );

    ALTER TABLE [dbo].[AuditoriaGeral]
    ADD CONSTRAINT [AuditoriaGeral_autorId_fkey]
    FOREIGN KEY ([autorId]) REFERENCES [dbo].[Usuario]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
