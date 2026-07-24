IF COL_LENGTH('dbo.Emprestimo', 'inadimplente') IS NULL
BEGIN
  ALTER TABLE [dbo].[Emprestimo]
    ADD [inadimplente] BIT NOT NULL
    CONSTRAINT [Emprestimo_inadimplente_df] DEFAULT 0;
END

IF COL_LENGTH('dbo.EmprestimoArquivado', 'inadimplente') IS NULL
BEGIN
  ALTER TABLE [dbo].[EmprestimoArquivado]
    ADD [inadimplente] BIT NOT NULL
    CONSTRAINT [EmprestimoArquivado_inadimplente_df] DEFAULT 0;
END

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'Emprestimo_inadimplente_idx' AND object_id = OBJECT_ID('dbo.Emprestimo')
)
BEGIN
  CREATE INDEX [Emprestimo_inadimplente_idx] ON [dbo].[Emprestimo]([inadimplente]);
END
