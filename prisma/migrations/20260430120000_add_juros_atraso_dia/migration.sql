IF COL_LENGTH('dbo.Emprestimo', 'jurosAtrasoDia') IS NULL
BEGIN
    ALTER TABLE [dbo].[Emprestimo] ADD [jurosAtrasoDia] FLOAT(53) NOT NULL CONSTRAINT [Emprestimo_jurosAtrasoDia_df] DEFAULT 0;
END
