ALTER TABLE [dbo].[EmprestimoHistorico] ADD [competenciaId] NVARCHAR(1000) NULL;

ALTER TABLE [dbo].[EmprestimoHistorico] ADD CONSTRAINT [EmprestimoHistorico_competenciaId_fkey]
  FOREIGN KEY ([competenciaId]) REFERENCES [dbo].[CompetenciaEmprestimo]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
