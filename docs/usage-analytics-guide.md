# Usage Analytics & Cost Management Guide

## Overview

The DaySave Usage Analytics system provides comprehensive monitoring and management of AI service costs, storage usage, and subscription limits. This system ensures users stay within their plan limits while providing administrators with powerful tools to manage costs and usage patterns.

## User Features

### Access Usage Analytics

Users can access their usage analytics through multiple paths:

1. **Main Dashboard**: Click the "Usage Analytics" card with the chart-pie icon
2. **Direct URL**: Navigate to `/dashboard/usage`
3. **Navigation Menu**: Available in user navigation (if implemented)

### Usage Dashboard Features

#### Real-time Usage Metrics

- **AI Token Usage**: Current month token consumption with provider breakdown
- **AI Costs**: Real-time cost calculations based on current pricing models
- **Storage Costs**: File storage and bandwidth usage costs
- **Total Monthly Spending**: Combined AI and storage costs for the current billing period

#### Visual Analytics

- **Interactive Charts**: 12-month usage trends for tokens, costs, and storage
- **Progress Bars**: Visual representation of usage vs subscription limits
- **Alert Indicators**: Color-coded warnings for approaching limits

#### Subscription Monitoring

- **Limit Tracking**: Real-time progress against monthly limits
- **Alert Thresholds**: Configurable warnings at 75%, 90%, and 100% of limits
- **Overage Warnings**: Clear notifications when limits are exceeded

#### Recent Activity

- **Content Processing Costs**: Detailed breakdown of recent AI analysis costs
- **Token Usage History**: Per-item token consumption tracking
- **Cost Attribution**: Link costs to specific content items and processing jobs

## Administrator Features

### Admin Usage Overview (`/admin/usage-overview`)

#### System-wide Statistics

- **Total System Usage**: Aggregate tokens, costs, and storage across all users
- **Monthly Trends**: System usage patterns and growth metrics
- **Top Users**: Highest usage users with detailed breakdowns
- **Billing Period Analysis**: Current billing cycle performance

#### Real-time Monitoring

- **Live Usage Feed**: Real-time updates of system activity
- **Alert Dashboard**: System-wide usage alerts and warnings
- **Performance Metrics**: System efficiency and cost per operation

### Usage Limits Management (`/admin/usage-limits`)

#### Subscription Plan Configuration

- **AI Token Limits**: Set monthly token limits per subscription plan
- **Cost Thresholds**: Configure monthly spending limits in USD
- **Storage Quotas**: Set storage limits and bandwidth allowances
- **Alert Thresholds**: Configure warning percentages (default: 75%, 90%)

#### Plan Management

- **Plan Updates**: Modify existing subscription plan limits
- **Bulk Operations**: Update multiple plans simultaneously
- **Limit Enforcement**: Enable/disable automatic limit enforcement
- **Grace Periods**: Configure overage grace periods

### Cost Configuration Management (`/admin/cost-configuration`)

#### AI Service Pricing

- **Provider Configuration**: Set costs per provider (OpenAI, Google, etc.)
- **Model-specific Pricing**: Different costs for different AI models
- **Token-based Billing**: Input/output token pricing configurations
- **Effective Date Management**: Schedule pricing changes for future dates

#### Storage Pricing

- **Storage Classes**: Configure pricing for different storage tiers
- **Bandwidth Costs**: Set egress and ingress pricing
- **Operation Costs**: Price per storage operation (reads, writes, deletes)
- **Regional Pricing**: Different pricing for different geographic regions

#### Impact Analysis

- **Cost Forecasting**: Predict cost impact of pricing changes
- **User Impact**: Analyze how pricing changes affect individual users
- **Historical Comparison**: Compare new pricing with historical usage patterns

## Technical Implementation

### Data Sources

#### AI Usage Tracking

```javascript
// External AI Usage tracking
{
  provider: 'openai',
  model: 'gpt-4',
  input_tokens: 1500,
  output_tokens: 800,
  thinking_tokens: 200,
  estimated_cost_usd: 0.0234,
  processing_job_id: 'uuid'
}
```

#### Storage Usage Tracking

```javascript
// Storage Usage tracking
{
  provider: 'google_cloud',
  storage_class: 'standard',
  operation_type: 'upload',
  bytes_transferred: 5242880,
  estimated_cost_usd: 0.0001,
  processing_job_id: 'uuid'
}
```

### Cost Calculation Engine

#### Real-time Cost Calculation

The system calculates costs in real-time using the current pricing configuration:

1. **AI Costs**: `(input_tokens / 1M * input_rate) + (output_tokens / 1M * output_rate)`
2. **Storage Costs**: `(bytes / GB * storage_rate) + (operations * operation_rate)`
3. **Total Costs**: Sum of all AI and storage costs for the billing period

#### Pricing Model Management

- **Versioned Pricing**: Historical pricing models maintained for accurate billing
- **Effective Date Handling**: Automatic pricing model switching based on dates
- **Currency Support**: Multi-currency support with exchange rate handling

### Database Schema

#### Usage Analytics Tables

```sql
-- External AI Usage
CREATE TABLE external_ai_usage (
  id CHAR(36) PRIMARY KEY,
  processing_job_id CHAR(36),
  provider VARCHAR(50),
  model VARCHAR(100),
  input_tokens INT,
  output_tokens INT,
  thinking_tokens INT,
  estimated_cost_usd DECIMAL(10,6),
  created_at TIMESTAMP
);

-- Storage Usage
CREATE TABLE storage_usage (
  id CHAR(36) PRIMARY KEY,
  processing_job_id CHAR(36),
  provider VARCHAR(50),
  storage_class VARCHAR(50),
  operation_type VARCHAR(50),
  bytes_transferred BIGINT,
  estimated_cost_usd DECIMAL(10,6),
  created_at TIMESTAMP
);

-- Pricing Configuration
CREATE TABLE ai_pricing_config (
  id CHAR(36) PRIMARY KEY,
  provider VARCHAR(50),
  model VARCHAR(100),
  input_cost_per_million_tokens DECIMAL(10,6),
  output_cost_per_million_tokens DECIMAL(10,6),
  thinking_cost_per_million_tokens DECIMAL(10,6),
  effective_date DATE,
  is_active BOOLEAN,
  created_at TIMESTAMP
);
```

## API Endpoints

### User Analytics API

```javascript
// Get current usage data
GET /dashboard/api/usage
// Response: { currentUsage, limits, billingPeriod, shouldAlert }

// Get usage history
GET /dashboard/api/usage-history?months=12
// Response: { usageHistory: [...] }
```

### Admin Analytics API

```javascript
// Get system statistics
GET /admin/api/usage-stats
// Response: { systemStats, topUsers, trends }

// Update subscription limits
POST /admin/usage-limits/update
// Body: { plans: { planId: { limits... } } }

// Save pricing configuration
POST /admin/cost-configuration/save
// Body: { type, provider, model, costs... }
```

## Configuration

### Environment Variables

```bash
# Usage Analytics Configuration
ENABLE_USAGE_ANALYTICS=true
USAGE_ALERT_THRESHOLD=75
BILLING_CYCLE_START_DAY=1
DEFAULT_CURRENCY=USD

# Cost Calculation
ENABLE_REAL_TIME_COSTS=true
COST_CALCULATION_PRECISION=6
EXCHANGE_RATE_UPDATE_INTERVAL=3600
```

### Subscription Plan Configuration

```javascript
// Example subscription plan with usage limits
{
  name: 'Professional',
  max_ai_tokens_per_month: 1000000,
  max_ai_cost_per_month_usd: 50.00,
  max_storage_cost_per_month_usd: 25.00,
  max_total_cost_per_month_usd: 75.00,
  usage_alerts_enabled: true,
  usage_alert_threshold_percent: 75
}
```

## Monitoring & Alerts

### User Alerts

- **75% Warning**: Notification when approaching subscription limits
- **90% Critical**: Urgent warning before limit enforcement
- **100% Limit Reached**: Service restrictions may apply
- **Overage Alerts**: Notifications for usage beyond limits

### Admin Monitoring

- **System Usage Spikes**: Alerts for unusual usage patterns
- **Cost Anomalies**: Notifications for unexpected cost increases
- **User Overages**: Reports of users exceeding limits
- **Service Health**: Usage analytics system health monitoring

## Troubleshooting

### Common Issues

#### Usage Data Not Updating

1. Check processing job completion status
2. Verify external AI usage tracking is enabled
3. Confirm storage usage tracking is working
4. Review log files for calculation errors

#### Incorrect Cost Calculations

1. Verify pricing configuration is active and current
2. Check effective dates on pricing models
3. Confirm exchange rates are updating
4. Review cost calculation formulas

#### Dashboard Loading Issues

1. Check browser JavaScript console for errors
2. Verify API endpoints are responding
3. Confirm user has proper permissions
4. Review template rendering errors

### Log Analysis

```bash
# Check usage analytics logs
docker logs daysave-app | grep "usage analytics"

# Monitor cost calculations
tail -f logs/app.log | grep "cost calculation"

# Review usage API calls
grep "dashboard/usage" logs/app.log
```

## Security Considerations

### Data Privacy

- **User Isolation**: Users can only see their own usage data
- **Admin Controls**: Admins have system-wide access with audit logging
- **Data Retention**: Usage data retained according to billing requirements

### API Security

- **Authentication Required**: All endpoints require valid user session
- **Role-based Access**: Admin endpoints restricted to admin users
- **Rate Limiting**: API endpoints protected against abuse
- **Input Validation**: All user inputs validated and sanitized

## Best Practices

### For Users

1. **Regular Monitoring**: Check usage analytics weekly
2. **Alert Configuration**: Set up email alerts for limit warnings
3. **Content Optimization**: Use analytics to optimize content processing
4. **Plan Management**: Upgrade plans before reaching limits

### For Administrators

1. **Pricing Reviews**: Regular review of AI service pricing
2. **Usage Monitoring**: Monitor system-wide usage trends
3. **Plan Optimization**: Adjust subscription plans based on usage patterns
4. **Cost Control**: Set appropriate limits to control costs

---

**Last Updated**: August 11, 2025
**Version**: 1.4.2
**Author**: DaySave Development Team
