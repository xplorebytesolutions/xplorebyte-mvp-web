Task AddEventAsync(
    Guid businessId,
    Guid contactId,
    string eventType,
    string description,
    string? source = null,
    string? category = null,
    Guid? referenceId = null,
    bool isSystemGenerated = true,
    string? ctaType = null,
    string? ctaSourceType = null,
    Guid? ctaSourceId = null,
    CancellationToken ct = default);
