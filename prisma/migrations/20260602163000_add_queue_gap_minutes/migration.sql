IF COL_LENGTH('dbo.WhatsappAutomationConfig', 'queueGapMinutes') IS NULL
BEGIN
  ALTER TABLE [dbo].[WhatsappAutomationConfig]
  ADD [queueGapMinutes] INT NOT NULL
      CONSTRAINT [WhatsappAutomationConfig_queueGapMinutes_df] DEFAULT 0;
END
