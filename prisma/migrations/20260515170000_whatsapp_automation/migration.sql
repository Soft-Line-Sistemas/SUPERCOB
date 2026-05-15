IF OBJECT_ID('dbo.WhatsappAutomationConfig', 'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[WhatsappAutomationConfig] (
    [id] NVARCHAR(1000) NOT NULL,
    [enabled] BIT NOT NULL CONSTRAINT [WhatsappAutomationConfig_enabled_df] DEFAULT 1,
    [defaultCountryCode] VARCHAR(5) NOT NULL CONSTRAINT [WhatsappAutomationConfig_defaultCountryCode_df] DEFAULT '55',
    [timezone] VARCHAR(60) NOT NULL CONSTRAINT [WhatsappAutomationConfig_timezone_df] DEFAULT 'America/Bahia',
    [quietHoursStart] VARCHAR(5) NULL,
    [quietHoursEnd] VARCHAR(5) NULL,
    [sendOnWeekends] BIT NOT NULL CONSTRAINT [WhatsappAutomationConfig_sendOnWeekends_df] DEFAULT 0,
    [minIntervalMinutes] INT NOT NULL CONSTRAINT [WhatsappAutomationConfig_minIntervalMinutes_df] DEFAULT 240,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [WhatsappAutomationConfig_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [WhatsappAutomationConfig_pkey] PRIMARY KEY CLUSTERED ([id])
  );
END

IF OBJECT_ID('dbo.WhatsappAutomationRule', 'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[WhatsappAutomationRule] (
    [id] NVARCHAR(1000) NOT NULL,
    [configId] NVARCHAR(1000) NOT NULL,
    [key] VARCHAR(50) NOT NULL,
    [title] VARCHAR(80) NOT NULL,
    [enabled] BIT NOT NULL CONSTRAINT [WhatsappAutomationRule_enabled_df] DEFAULT 1,
    [priority] INT NOT NULL CONSTRAINT [WhatsappAutomationRule_priority_df] DEFAULT 100,
    [triggerType] VARCHAR(20) NOT NULL,
    [offsetDays] INT NOT NULL CONSTRAINT [WhatsappAutomationRule_offsetDays_df] DEFAULT 0,
    [recurrenceDays] INT NULL,
    [sendTime] VARCHAR(5) NOT NULL CONSTRAINT [WhatsappAutomationRule_sendTime_df] DEFAULT '09:00',
    [template] NVARCHAR(MAX) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [WhatsappAutomationRule_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [WhatsappAutomationRule_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [WhatsappAutomationRule_configId_fkey] FOREIGN KEY ([configId]) REFERENCES [dbo].[WhatsappAutomationConfig]([id]) ON DELETE CASCADE ON UPDATE CASCADE
  );
END

IF OBJECT_ID('dbo.WhatsappAutomationClientPreference', 'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[WhatsappAutomationClientPreference] (
    [id] NVARCHAR(1000) NOT NULL,
    [clienteId] NVARCHAR(1000) NOT NULL,
    [enabled] BIT NOT NULL CONSTRAINT [WhatsappAutomationClientPreference_enabled_df] DEFAULT 1,
    [pausedAt] DATETIME2 NULL,
    [pauseReason] VARCHAR(120) NULL,
    [allowRecurrence] BIT NOT NULL CONSTRAINT [WhatsappAutomationClientPreference_allowRecurrence_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [WhatsappAutomationClientPreference_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [WhatsappAutomationClientPreference_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [WhatsappAutomationClientPreference_clienteId_fkey] FOREIGN KEY ([clienteId]) REFERENCES [dbo].[Cliente]([id]) ON DELETE CASCADE ON UPDATE CASCADE
  );
END

IF OBJECT_ID('dbo.WhatsappAutomationDispatch', 'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[WhatsappAutomationDispatch] (
    [id] NVARCHAR(1000) NOT NULL,
    [ruleId] NVARCHAR(1000) NOT NULL,
    [emprestimoId] NVARCHAR(1000) NOT NULL,
    [status] VARCHAR(20) NOT NULL CONSTRAINT [WhatsappAutomationDispatch_status_df] DEFAULT 'PENDING',
    [scheduledFor] DATETIME2 NULL,
    [attemptedAt] DATETIME2 NULL,
    [sentAt] DATETIME2 NULL,
    [errorMessage] NVARCHAR(MAX) NULL,
    [payloadPreview] NVARCHAR(MAX) NULL,
    [providerRef] VARCHAR(120) NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [WhatsappAutomationDispatch_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [WhatsappAutomationDispatch_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [WhatsappAutomationDispatch_ruleId_fkey] FOREIGN KEY ([ruleId]) REFERENCES [dbo].[WhatsappAutomationRule]([id]) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT [WhatsappAutomationDispatch_emprestimoId_fkey] FOREIGN KEY ([emprestimoId]) REFERENCES [dbo].[Emprestimo]([id]) ON DELETE CASCADE ON UPDATE CASCADE
  );
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'WhatsappAutomationRule_key_key' AND object_id = OBJECT_ID('dbo.WhatsappAutomationRule'))
  CREATE UNIQUE INDEX [WhatsappAutomationRule_key_key] ON [dbo].[WhatsappAutomationRule]([key]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'WhatsappAutomationClientPreference_clienteId_key' AND object_id = OBJECT_ID('dbo.WhatsappAutomationClientPreference'))
  CREATE UNIQUE INDEX [WhatsappAutomationClientPreference_clienteId_key] ON [dbo].[WhatsappAutomationClientPreference]([clienteId]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'WhatsappAutomationRule_configId_idx' AND object_id = OBJECT_ID('dbo.WhatsappAutomationRule'))
  CREATE INDEX [WhatsappAutomationRule_configId_idx] ON [dbo].[WhatsappAutomationRule]([configId]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'WhatsappAutomationRule_enabled_priority_idx' AND object_id = OBJECT_ID('dbo.WhatsappAutomationRule'))
  CREATE INDEX [WhatsappAutomationRule_enabled_priority_idx] ON [dbo].[WhatsappAutomationRule]([enabled], [priority]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'WhatsappAutomationClientPreference_enabled_idx' AND object_id = OBJECT_ID('dbo.WhatsappAutomationClientPreference'))
  CREATE INDEX [WhatsappAutomationClientPreference_enabled_idx] ON [dbo].[WhatsappAutomationClientPreference]([enabled]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'WhatsappAutomationDispatch_ruleId_status_idx' AND object_id = OBJECT_ID('dbo.WhatsappAutomationDispatch'))
  CREATE INDEX [WhatsappAutomationDispatch_ruleId_status_idx] ON [dbo].[WhatsappAutomationDispatch]([ruleId], [status]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'WhatsappAutomationDispatch_emprestimoId_createdAt_idx' AND object_id = OBJECT_ID('dbo.WhatsappAutomationDispatch'))
  CREATE INDEX [WhatsappAutomationDispatch_emprestimoId_createdAt_idx] ON [dbo].[WhatsappAutomationDispatch]([emprestimoId], [createdAt]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'WhatsappAutomationDispatch_scheduledFor_idx' AND object_id = OBJECT_ID('dbo.WhatsappAutomationDispatch'))
  CREATE INDEX [WhatsappAutomationDispatch_scheduledFor_idx] ON [dbo].[WhatsappAutomationDispatch]([scheduledFor]);
