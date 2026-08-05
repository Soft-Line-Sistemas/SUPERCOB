IF COL_LENGTH('dbo.Emprestimo', 'jurosPagosNoInicioCiclo') IS NULL
BEGIN
    ALTER TABLE [dbo].[Emprestimo] ADD [jurosPagosNoInicioCiclo] FLOAT(53) NOT NULL CONSTRAINT [Emprestimo_jurosPagosNoInicioCiclo_df] DEFAULT 0;
END;

IF COL_LENGTH('dbo.Emprestimo', 'jurosCicloIniciadoEm') IS NULL
BEGIN
    ALTER TABLE [dbo].[Emprestimo] ADD [jurosCicloIniciadoEm] DATETIME2;
END;

IF COL_LENGTH('dbo.EmprestimoArquivado', 'jurosPagosNoInicioCiclo') IS NULL
BEGIN
    ALTER TABLE [dbo].[EmprestimoArquivado] ADD [jurosPagosNoInicioCiclo] FLOAT(53) NOT NULL CONSTRAINT [EmprestimoArquivado_jurosPagosNoInicioCiclo_df] DEFAULT 0;
END;

IF COL_LENGTH('dbo.EmprestimoArquivado', 'jurosCicloIniciadoEm') IS NULL
BEGIN
    ALTER TABLE [dbo].[EmprestimoArquivado] ADD [jurosCicloIniciadoEm] DATETIME2;
END;
