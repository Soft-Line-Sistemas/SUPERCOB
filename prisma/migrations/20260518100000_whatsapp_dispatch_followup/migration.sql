IF OBJECT_ID('dbo.WhatsappAutomationDispatch', 'U') IS NOT NULL
BEGIN
  IF COL_LENGTH('dbo.WhatsappAutomationDispatch', 'triggerMode') IS NULL
  BEGIN
    ALTER TABLE [dbo].[WhatsappAutomationDispatch]
      ADD [triggerMode] VARCHAR(20) NOT NULL CONSTRAINT [WhatsappAutomationDispatch_triggerMode_df] DEFAULT 'MANUAL';
  END

  IF COL_LENGTH('dbo.WhatsappAutomationDispatch', 'requiresManualFollowUp') IS NULL
  BEGIN
    ALTER TABLE [dbo].[WhatsappAutomationDispatch]
      ADD [requiresManualFollowUp] BIT NOT NULL CONSTRAINT [WhatsappAutomationDispatch_requiresManualFollowUp_df] DEFAULT 0;
  END

  IF COL_LENGTH('dbo.WhatsappAutomationDispatch', 'followUpStatus') IS NULL
  BEGIN
    ALTER TABLE [dbo].[WhatsappAutomationDispatch]
      ADD [followUpStatus] VARCHAR(20) NOT NULL CONSTRAINT [WhatsappAutomationDispatch_followUpStatus_df] DEFAULT 'NONE';
  END

  IF COL_LENGTH('dbo.WhatsappAutomationDispatch', 'followUpResolvedAt') IS NULL
  BEGIN
    ALTER TABLE [dbo].[WhatsappAutomationDispatch]
      ADD [followUpResolvedAt] DATETIME2 NULL;
  END

  IF COL_LENGTH('dbo.WhatsappAutomationDispatch', 'followUpNotes') IS NULL
  BEGIN
    ALTER TABLE [dbo].[WhatsappAutomationDispatch]
      ADD [followUpNotes] NVARCHAR(MAX) NULL;
  END

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'WhatsappAutomationDispatch_followUpStatus_idx' AND object_id = OBJECT_ID('dbo.WhatsappAutomationDispatch'))
    CREATE INDEX [WhatsappAutomationDispatch_followUpStatus_idx] ON [dbo].[WhatsappAutomationDispatch]([followUpStatus], [requiresManualFollowUp]);
END
