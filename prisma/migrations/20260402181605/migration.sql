BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Cliente] ADD [numeroEndereco] INT;

-- AlterTable
ALTER TABLE [dbo].[Emprestimo] ADD [valorPago] FLOAT(53) NOT NULL CONSTRAINT [Emprestimo_valorPago_df] DEFAULT 0;

-- CreateTable
CREATE TABLE [dbo].[PermissaoAuditoria] (
    [id] NVARCHAR(1000) NOT NULL,
    [alvoId] NVARCHAR(1000) NOT NULL,
    [autorId] NVARCHAR(1000) NOT NULL,
    [tipo] VARCHAR(50) NOT NULL,
    [antes] TEXT,
    [depois] TEXT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PermissaoAuditoria_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PermissaoAuditoria_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[PermissaoAuditoria] ADD CONSTRAINT [PermissaoAuditoria_alvoId_fkey] FOREIGN KEY ([alvoId]) REFERENCES [dbo].[Usuario]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PermissaoAuditoria] ADD CONSTRAINT [PermissaoAuditoria_autorId_fkey] FOREIGN KEY ([autorId]) REFERENCES [dbo].[Usuario]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
