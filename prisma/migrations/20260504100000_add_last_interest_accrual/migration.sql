IF COL_LENGTH('dbo.Emprestimo', 'lastInterestAccrual') IS NULL
BEGIN
    ALTER TABLE [dbo].[Emprestimo] ADD [lastInterestAccrual] DATETIME2;
END;
