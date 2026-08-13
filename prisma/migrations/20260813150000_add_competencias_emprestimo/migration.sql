CREATE TABLE [dbo].[CompetenciaEmprestimo] (
    [id] NVARCHAR(1000) NOT NULL,
    [emprestimoId] NVARCHAR(1000) NOT NULL,
    [vencimento] DATETIME2(3) NOT NULL,
    [valorPrevisto] FLOAT(53) NOT NULL,
    [valorPago] FLOAT(53) NOT NULL DEFAULT 0,
    [pagoEm] DATETIME2(3),
    [createdAt] DATETIME2(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2(3) NOT NULL,

    CONSTRAINT [CompetenciaEmprestimo_pkey] PRIMARY KEY CLUSTERED ([id])
);

ALTER TABLE [dbo].[CompetenciaEmprestimo] ADD CONSTRAINT [CompetenciaEmprestimo_emprestimoId_fkey]
  FOREIGN KEY ([emprestimoId]) REFERENCES [dbo].[Emprestimo]([id]) ON DELETE CASCADE ON UPDATE CASCADE;
