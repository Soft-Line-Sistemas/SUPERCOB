BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Usuario] (
    [id] NVARCHAR(1000) NOT NULL,
    [nome] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [senha] NVARCHAR(1000) NOT NULL,
    [role] VARCHAR(20) NOT NULL CONSTRAINT [Usuario_role_df] DEFAULT 'OPERADOR',
    [avatarUrl] NVARCHAR(1000),
    [isActive] BIT NOT NULL CONSTRAINT [Usuario_isActive_df] DEFAULT 1,
    [canManageUsers] BIT NOT NULL CONSTRAINT [Usuario_canManageUsers_df] DEFAULT 0,
    [canManageClients] BIT NOT NULL CONSTRAINT [Usuario_canManageClients_df] DEFAULT 1,
    [canManageLoans] BIT NOT NULL CONSTRAINT [Usuario_canManageLoans_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Usuario_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Usuario_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Usuario_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[MensagemInterna] (
    [id] NVARCHAR(1000) NOT NULL,
    [conteudo] TEXT NOT NULL,
    [isLida] BIT NOT NULL CONSTRAINT [MensagemInterna_isLida_df] DEFAULT 0,
    [isMassiva] BIT NOT NULL CONSTRAINT [MensagemInterna_isMassiva_df] DEFAULT 0,
    [remetenteId] NVARCHAR(1000) NOT NULL,
    [destinatarioId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [MensagemInterna_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [MensagemInterna_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Cliente] (
    [id] NVARCHAR(1000) NOT NULL,
    [nome] NVARCHAR(1000) NOT NULL,
    [indicacao] NVARCHAR(1000),
    [cpf] NVARCHAR(1000),
    [rg] NVARCHAR(1000),
    [orgao] NVARCHAR(1000),
    [diaNasc] INT,
    [mesNasc] INT,
    [anoNasc] INT,
    [email] NVARCHAR(1000),
    [whatsapp] NVARCHAR(1000),
    [instagram] NVARCHAR(1000),
    [cep] NVARCHAR(1000),
    [endereco] NVARCHAR(1000),
    [complemento] NVARCHAR(1000),
    [bairro] NVARCHAR(1000),
    [cidade] NVARCHAR(1000),
    [estado] NVARCHAR(1000),
    [pontoReferencia] NVARCHAR(1000),
    [profissao] NVARCHAR(1000),
    [empresa] NVARCHAR(1000),
    [cepEmpresa] NVARCHAR(1000),
    [enderecoEmpresa] NVARCHAR(1000),
    [cidadeEmpresa] NVARCHAR(1000),
    [estadoEmpresa] NVARCHAR(1000),
    [contatoEmergencia1] NVARCHAR(1000),
    [contatoEmergencia2] NVARCHAR(1000),
    [contatoEmergencia3] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Cliente_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Cliente_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Emprestimo] (
    [id] NVARCHAR(1000) NOT NULL,
    [clienteId] NVARCHAR(1000) NOT NULL,
    [usuarioId] NVARCHAR(1000),
    [valor] FLOAT(53) NOT NULL,
    [jurosMes] FLOAT(53) NOT NULL CONSTRAINT [Emprestimo_jurosMes_df] DEFAULT 0,
    [vencimento] DATETIME2,
    [quitadoEm] DATETIME2,
    [status] VARCHAR(20) NOT NULL CONSTRAINT [Emprestimo_status_df] DEFAULT 'ABERTO',
    [observacao] TEXT,
    [arquivo1] NVARCHAR(1000),
    [arquivo2] NVARCHAR(1000),
    [arquivo3] NVARCHAR(1000),
    [arquivo4] NVARCHAR(1000),
    [arquivo5] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Emprestimo_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Emprestimo_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[EmprestimoHistorico] (
    [id] NVARCHAR(1000) NOT NULL,
    [emprestimoId] NVARCHAR(1000) NOT NULL,
    [descricao] TEXT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [EmprestimoHistorico_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdById] NVARCHAR(1000),
    CONSTRAINT [EmprestimoHistorico_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ClienteDocumento] (
    [id] NVARCHAR(1000) NOT NULL,
    [clienteId] NVARCHAR(1000) NOT NULL,
    [originalName] NVARCHAR(1000) NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [mimeType] VARCHAR(100) NOT NULL,
    [size] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ClienteDocumento_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ClienteDocumento_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ClienteDocumento_fileName_key] UNIQUE NONCLUSTERED ([fileName])
);

-- AddForeignKey
ALTER TABLE [dbo].[MensagemInterna] ADD CONSTRAINT [MensagemInterna_remetenteId_fkey] FOREIGN KEY ([remetenteId]) REFERENCES [dbo].[Usuario]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MensagemInterna] ADD CONSTRAINT [MensagemInterna_destinatarioId_fkey] FOREIGN KEY ([destinatarioId]) REFERENCES [dbo].[Usuario]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Emprestimo] ADD CONSTRAINT [Emprestimo_clienteId_fkey] FOREIGN KEY ([clienteId]) REFERENCES [dbo].[Cliente]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Emprestimo] ADD CONSTRAINT [Emprestimo_usuarioId_fkey] FOREIGN KEY ([usuarioId]) REFERENCES [dbo].[Usuario]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[EmprestimoHistorico] ADD CONSTRAINT [EmprestimoHistorico_emprestimoId_fkey] FOREIGN KEY ([emprestimoId]) REFERENCES [dbo].[Emprestimo]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[EmprestimoHistorico] ADD CONSTRAINT [EmprestimoHistorico_createdById_fkey] FOREIGN KEY ([createdById]) REFERENCES [dbo].[Usuario]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClienteDocumento] ADD CONSTRAINT [ClienteDocumento_clienteId_fkey] FOREIGN KEY ([clienteId]) REFERENCES [dbo].[Cliente]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
