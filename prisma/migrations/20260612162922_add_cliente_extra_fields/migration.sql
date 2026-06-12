IF COL_LENGTH('dbo.Cliente', 'telefone2') IS NULL
BEGIN
  ALTER TABLE [dbo].[Cliente] ADD [telefone2] NVARCHAR(1000);
END

IF COL_LENGTH('dbo.Cliente', 'observacoes') IS NULL
BEGIN
  ALTER TABLE [dbo].[Cliente] ADD [observacoes] NVARCHAR(MAX);
END

IF COL_LENGTH('dbo.Cliente', 'cep2') IS NULL
BEGIN
  ALTER TABLE [dbo].[Cliente] ADD [cep2] NVARCHAR(1000);
END

IF COL_LENGTH('dbo.Cliente', 'endereco2') IS NULL
BEGIN
  ALTER TABLE [dbo].[Cliente] ADD [endereco2] NVARCHAR(1000);
END

IF COL_LENGTH('dbo.Cliente', 'numeroEndereco2') IS NULL
BEGIN
  ALTER TABLE [dbo].[Cliente] ADD [numeroEndereco2] INT;
END

IF COL_LENGTH('dbo.Cliente', 'complemento2') IS NULL
BEGIN
  ALTER TABLE [dbo].[Cliente] ADD [complemento2] NVARCHAR(1000);
END

IF COL_LENGTH('dbo.Cliente', 'bairro2') IS NULL
BEGIN
  ALTER TABLE [dbo].[Cliente] ADD [bairro2] NVARCHAR(1000);
END

IF COL_LENGTH('dbo.Cliente', 'cidade2') IS NULL
BEGIN
  ALTER TABLE [dbo].[Cliente] ADD [cidade2] NVARCHAR(1000);
END

IF COL_LENGTH('dbo.Cliente', 'estado2') IS NULL
BEGIN
  ALTER TABLE [dbo].[Cliente] ADD [estado2] NVARCHAR(1000);
END

IF COL_LENGTH('dbo.Cliente', 'pontoReferencia2') IS NULL
BEGIN
  ALTER TABLE [dbo].[Cliente] ADD [pontoReferencia2] NVARCHAR(1000);
END
