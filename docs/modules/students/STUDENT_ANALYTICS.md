# Student Analytics Specification

## Core Metrics
- **Total Active Students**: Current count of `status = ACTIVE`
- **Total Suspended**: Current count of `status = SUSPENDED`
- **Total Alumni**: Current count of `status = ALUMNI`
- **Gender Distribution**: Aggregation by `StudentProfile.gender`
- **Age Demographics**: Aggregation by `StudentProfile.dateOfBirth`

These metrics will be refreshed synchronously by listening to `Student.StatusChanged` and `Student.Updated` events.
