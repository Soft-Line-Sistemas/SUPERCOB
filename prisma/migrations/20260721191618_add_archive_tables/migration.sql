IF OBJECT_ID('dbo.ClienteArquivado', 'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[ClienteArquivado] (
    [id] NVARCHAR(1000) NOT NULL,
    [nome] NVARCHAR(1000) NOT NULL,
    [indicacao] NVARCHAR(1000) NULL,
    [cpf] NVARCHAR(1000) NULL,
    [rg] NVARCHAR(1000) NULL,
    [orgao] NVARCHAR(1000) NULL,
    [diaNasc] INT NULL,
    [mesNasc] INT NULL,
    [anoNasc] INT NULL,
    [email] NVARCHAR(1000) NULL,
    [whatsapp] NVARCHAR(1000) NULL,
    [instagram] NVARCHAR(1000) NULL,
    [cep] NVARCHAR(1000) NULL,
    [endereco] NVARCHAR(1000) NULL,
    [complemento] NVARCHAR(1000) NULL,
    [bairro] NVARCHAR(1000) NULL,
    [cidade] NVARCHAR(1000) NULL,
    [estado] NVARCHAR(1000) NULL,
    [pontoReferencia] NVARCHAR(1000) NULL,
    [profissao] NVARCHAR(1000) NULL,
    [empresa] NVARCHAR(1000) NULL,
    [cepEmpresa] NVARCHAR(1000) NULL,
    [enderecoEmpresa] NVARCHAR(1000) NULL,
    [cidadeEmpresa] NVARCHAR(1000) NULL,
    [estadoEmpresa] NVARCHAR(1000) NULL,
    [contatoEmergencia1] NVARCHAR(1000) NULL,
    [contatoEmergencia2] NVARCHAR(1000) NULL,
    [contatoEmergencia3] NVARCHAR(1000) NULL,
    [telefone2] NVARCHAR(1000) NULL,
    [observacoes] NVARCHAR(MAX) NULL,
    [cep2] NVARCHAR(1000) NULL,
    [endereco2] NVARCHAR(1000) NULL,
    [numeroEndereco2] INT NULL,
    [complemento2] NVARCHAR(1000) NULL,
    [bairro2] NVARCHAR(1000) NULL,
    [cidade2] NVARCHAR(1000) NULL,
    [estado2] NVARCHAR(1000) NULL,
    [pontoReferencia2] NVARCHAR(1000) NULL,
    [numeroEndereco] INT NULL,
    [createdAt] DATETIME2 NOT NULL,
    [arquivadoEm] DATETIME2 NOT NULL CONSTRAINT [ClienteArquivado_arquivadoEm_df] DEFAULT CURRENT_TIMESTAMP,
    [arquivadoPorId] NVARCHAR(1000) NULL,
    [motivoArquivamento] NVARCHAR(MAX) NULL,
    CONSTRAINT [ClienteArquivado_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ClienteArquivado_arquivadoPorId_fkey] FOREIGN KEY ([arquivadoPorId]) REFERENCES [dbo].[Usuario]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
  );
END

IF OBJECT_ID('dbo.EmprestimoArquivado', 'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[EmprestimoArquivado] (
    [id] NVARCHAR(1000) NOT NULL,
    [clienteId] NVARCHAR(1000) NOT NULL,
    [usuarioId] NVARCHAR(1000) NULL,
    [valor] FLOAT(53) NOT NULL,
    [quantidadeParcelas] INT NULL,
    [jurosMes] FLOAT(53) NOT NULL,
    [jurosAtrasoDia] FLOAT(53) NOT NULL,
    [vencimento] DATETIME2 NULL,
    [quitadoEm] DATETIME2 NULL,
    [status] VARCHAR(20) NOT NULL,
    [observacao] NVARCHAR(MAX) NULL,
    [arquivo1] NVARCHAR(1000) NULL,
    [arquivo2] NVARCHAR(1000) NULL,
    [arquivo3] NVARCHAR(1000) NULL,
    [arquivo4] NVARCHAR(1000) NULL,
    [arquivo5] NVARCHAR(1000) NULL,
    [createdAt] DATETIME2 NOT NULL,
    [valorPago] FLOAT(53) NOT NULL,
    [jurosPagos] FLOAT(53) NOT NULL,
    [cobrancaAtiva] BIT NOT NULL,
    [lastInterestAccrual] DATETIME2 NULL,
    [arquivadoEm] DATETIME2 NOT NULL CONSTRAINT [EmprestimoArquivado_arquivadoEm_df] DEFAULT CURRENT_TIMESTAMP,
    [arquivadoPorId] NVARCHAR(1000) NULL,
    [motivoArquivamento] NVARCHAR(MAX) NULL,
    [clienteTambemArquivado] BIT NOT NULL CONSTRAINT [EmprestimoArquivado_clienteTambemArquivado_df] DEFAULT 0,
    CONSTRAINT [EmprestimoArquivado_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [EmprestimoArquivado_usuarioId_fkey] FOREIGN KEY ([usuarioId]) REFERENCES [dbo].[Usuario]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [EmprestimoArquivado_arquivadoPorId_fkey] FOREIGN KEY ([arquivadoPorId]) REFERENCES [dbo].[Usuario]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
  );
END

IF OBJECT_ID('dbo.WhatsappAutomationClientPreferenceArquivado', 'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[WhatsappAutomationClientPreferenceArquivado] (
    [id] NVARCHAR(1000) NOT NULL,
    [clienteId] NVARCHAR(1000) NOT NULL,
    [enabled] BIT NOT NULL,
    [pausedAt] DATETIME2 NULL,
    [pauseReason] VARCHAR(120) NULL,
    [allowRecurrence] BIT NOT NULL,
    [createdAt] DATETIME2 NOT NULL,
    [updatedAt] DATETIME2 NOT NULL,
    [arquivadoEm] DATETIME2 NOT NULL CONSTRAINT [WhatsappAutomationClientPreferenceArquivado_arquivadoEm_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [WhatsappAutomationClientPreferenceArquivado_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [WhatsappAutomationClientPreferenceArquivado_clienteId_fkey] FOREIGN KEY ([clienteId]) REFERENCES [dbo].[ClienteArquivado]([id]) ON DELETE CASCADE ON UPDATE CASCADE
  );
END

IF OBJECT_ID('dbo.WhatsappAutomationDispatchArquivado', 'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[WhatsappAutomationDispatchArquivado] (
    [id] NVARCHAR(1000) NOT NULL,
    [ruleId] NVARCHAR(1000) NOT NULL,
    [emprestimoId] NVARCHAR(1000) NOT NULL,
    [status] VARCHAR(20) NOT NULL,
    [scheduledFor] DATETIME2 NULL,
    [attemptedAt] DATETIME2 NULL,
    [sentAt] DATETIME2 NULL,
    [errorMessage] NVARCHAR(MAX) NULL,
    [payloadPreview] NVARCHAR(MAX) NULL,
    [providerRef] VARCHAR(120) NULL,
    [triggerMode] VARCHAR(20) NOT NULL,
    [requiresManualFollowUp] BIT NOT NULL,
    [followUpStatus] VARCHAR(20) NOT NULL,
    [followUpResolvedAt] DATETIME2 NULL,
    [followUpNotes] NVARCHAR(MAX) NULL,
    [createdAt] DATETIME2 NOT NULL,
    [arquivadoEm] DATETIME2 NOT NULL CONSTRAINT [WhatsappAutomationDispatchArquivado_arquivadoEm_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [WhatsappAutomationDispatchArquivado_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [WhatsappAutomationDispatchArquivado_ruleId_fkey] FOREIGN KEY ([ruleId]) REFERENCES [dbo].[WhatsappAutomationRule]([id]) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT [WhatsappAutomationDispatchArquivado_emprestimoId_fkey] FOREIGN KEY ([emprestimoId]) REFERENCES [dbo].[EmprestimoArquivado]([id]) ON DELETE CASCADE ON UPDATE CASCADE
  );
END

IF OBJECT_ID('dbo.EmprestimoHistoricoArquivado', 'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[EmprestimoHistoricoArquivado] (
    [id] NVARCHAR(1000) NOT NULL,
    [emprestimoId] NVARCHAR(1000) NOT NULL,
    [descricao] NVARCHAR(MAX) NOT NULL,
    [createdAt] DATETIME2 NOT NULL,
    [createdById] NVARCHAR(1000) NULL,
    [tipo] VARCHAR(20) NULL,
    [arquivadoEm] DATETIME2 NOT NULL CONSTRAINT [EmprestimoHistoricoArquivado_arquivadoEm_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [EmprestimoHistoricoArquivado_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [EmprestimoHistoricoArquivado_createdById_fkey] FOREIGN KEY ([createdById]) REFERENCES [dbo].[Usuario]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [EmprestimoHistoricoArquivado_emprestimoId_fkey] FOREIGN KEY ([emprestimoId]) REFERENCES [dbo].[EmprestimoArquivado]([id]) ON DELETE CASCADE ON UPDATE CASCADE
  );
END

IF OBJECT_ID('dbo.ClienteDocumentoArquivado', 'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[ClienteDocumentoArquivado] (
    [id] NVARCHAR(1000) NOT NULL,
    [clienteId] NVARCHAR(1000) NOT NULL,
    [originalName] NVARCHAR(1000) NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [mimeType] VARCHAR(100) NOT NULL,
    [size] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL,
    [arquivadoEm] DATETIME2 NOT NULL CONSTRAINT [ClienteDocumentoArquivado_arquivadoEm_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ClienteDocumentoArquivado_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ClienteDocumentoArquivado_clienteId_fkey] FOREIGN KEY ([clienteId]) REFERENCES [dbo].[ClienteArquivado]([id]) ON DELETE CASCADE ON UPDATE CASCADE
  );
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ClienteArquivado_arquivadoEm_idx' AND object_id = OBJECT_ID('dbo.ClienteArquivado'))
  CREATE INDEX [ClienteArquivado_arquivadoEm_idx] ON [dbo].[ClienteArquivado]([arquivadoEm]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ClienteArquivado_cpf_idx' AND object_id = OBJECT_ID('dbo.ClienteArquivado'))
  CREATE INDEX [ClienteArquivado_cpf_idx] ON [dbo].[ClienteArquivado]([cpf]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'EmprestimoArquivado_clienteId_idx' AND object_id = OBJECT_ID('dbo.EmprestimoArquivado'))
  CREATE INDEX [EmprestimoArquivado_clienteId_idx] ON [dbo].[EmprestimoArquivado]([clienteId]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'EmprestimoArquivado_arquivadoEm_idx' AND object_id = OBJECT_ID('dbo.EmprestimoArquivado'))
  CREATE INDEX [EmprestimoArquivado_arquivadoEm_idx] ON [dbo].[EmprestimoArquivado]([arquivadoEm]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'EmprestimoArquivado_status_idx' AND object_id = OBJECT_ID('dbo.EmprestimoArquivado'))
  CREATE INDEX [EmprestimoArquivado_status_idx] ON [dbo].[EmprestimoArquivado]([status]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'WhatsappAutomationClientPreferenceArquivado_clienteId_key' AND object_id = OBJECT_ID('dbo.WhatsappAutomationClientPreferenceArquivado'))
  CREATE UNIQUE INDEX [WhatsappAutomationClientPreferenceArquivado_clienteId_key] ON [dbo].[WhatsappAutomationClientPreferenceArquivado]([clienteId]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'WhatsappAutomationDispatchArquivado_emprestimoId_idx' AND object_id = OBJECT_ID('dbo.WhatsappAutomationDispatchArquivado'))
  CREATE INDEX [WhatsappAutomationDispatchArquivado_emprestimoId_idx] ON [dbo].[WhatsappAutomationDispatchArquivado]([emprestimoId]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'WhatsappAutomationDispatchArquivado_ruleId_status_idx' AND object_id = OBJECT_ID('dbo.WhatsappAutomationDispatchArquivado'))
  CREATE INDEX [WhatsappAutomationDispatchArquivado_ruleId_status_idx] ON [dbo].[WhatsappAutomationDispatchArquivado]([ruleId], [status]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'EmprestimoHistoricoArquivado_emprestimoId_idx' AND object_id = OBJECT_ID('dbo.EmprestimoHistoricoArquivado'))
  CREATE INDEX [EmprestimoHistoricoArquivado_emprestimoId_idx] ON [dbo].[EmprestimoHistoricoArquivado]([emprestimoId]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ClienteDocumentoArquivado_fileName_key' AND object_id = OBJECT_ID('dbo.ClienteDocumentoArquivado'))
  CREATE UNIQUE INDEX [ClienteDocumentoArquivado_fileName_key] ON [dbo].[ClienteDocumentoArquivado]([fileName]);
