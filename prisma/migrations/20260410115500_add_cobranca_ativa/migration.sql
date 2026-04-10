BEGIN TRY

BEGIN TRAN;

-- AlterTable
IF COL_LENGTH('dbo.Emprestimo', 'cobrancaAtiva') IS NULL
BEGIN
    ALTER TABLE [dbo].[Emprestimo] ADD [cobrancaAtiva] BIT NOT NULL CONSTRAINT [Emprestimo_cobrancaAtiva_df] DEFAULT 0;
END

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
